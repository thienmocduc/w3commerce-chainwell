"""WellKOC — Orders Endpoints (Full)"""
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/orders", tags=["Orders"])

class CheckoutReq(BaseModel):
    """
    Frontend (CheckoutData) sends shipping_address + payment_method.
    Items are loaded from cart (Redis). items field is optional for
    direct API calls (admin/testing).
    """
    shipping_address: dict
    payment_method: str
    coupon_code: Optional[str] = None
    voucher_code: Optional[str] = None       # alias
    koc_ref_id: Optional[str] = None
    koc_referral_code: Optional[str] = None  # alias
    use_w3c_token: Optional[bool] = False
    notes: Optional[str] = None
    items: Optional[list] = None             # optional — loaded from cart if omitted
    idempotency_key: Optional[str] = None

@router.post("", status_code=201)
async def create_order(body: CheckoutReq, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    idem_key = body.idempotency_key or secrets.token_hex(16)
    existing = await db.execute(select(Order).where(Order.idempotency_key == idem_key))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Đơn hàng đã tồn tại (idempotent)")

    # Load items from cart if not provided directly
    items = body.items
    if not items:
        from app.api.v1.endpoints.cart import _get_cart
        items = await _get_cart(str(current_user.id))
    if not items:
        raise HTTPException(400, "Giỏ hàng trống — không thể tạo đơn hàng")

    coupon = body.coupon_code or body.voucher_code
    koc_ref = body.koc_ref_id or body.koc_referral_code

    subtotal = sum(float(i.get("price", 0)) * i.get("quantity", 1) for i in items)
    order_num = f"ORD-{datetime.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    order = Order(
        order_number=order_num, buyer_id=current_user.id,
        vendor_id=items[0].get("vendor_id", current_user.id),
        items=items, subtotal=subtotal, total=subtotal,
        shipping_address=body.shipping_address, payment_method=body.payment_method,
        voucher_code=coupon, status=OrderStatus.PENDING,
        idempotency_key=idem_key,
        status_history=[{"status": "pending", "timestamp": datetime.now(timezone.utc).isoformat()}],
    )
    db.add(order); await db.flush()

    # Clear cart after successful order creation
    from app.api.v1.endpoints.cart import _save_cart
    await _save_cart(str(current_user.id), [])

    return {"order_id": str(order.id), "order_number": order.order_number, "total": order.total, "status": order.status}

@router.get("")
async def list_orders(
    status: Optional[str] = None, page: int = Query(1,ge=1), per_page: int = Query(20,ge=1,le=100),
    *,
    current_user: CurrentUser, db: AsyncSession = Depends(get_db),
):
    q = select(Order).where(Order.buyer_id == current_user.id)
    if status: q = q.where(Order.status == status)
    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0
    q = q.offset((page-1)*per_page).limit(per_page).order_by(Order.created_at.desc())
    r = await db.execute(q); orders = r.scalars().all()
    return {"items": [_order_dict(o) for o in orders], "total": total, "page": page}

@router.get("/{order_id}")
async def get_order(order_id: UUID, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order: raise HTTPException(404, "Đơn hàng không tồn tại")
    if str(order.buyer_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(403, "Không có quyền xem đơn này")
    return _order_dict(order)

@router.put("/{order_id}/status")
async def update_status(
    order_id: UUID, status: str,
    current_user: User = Depends(require_role([UserRole.VENDOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order: raise HTTPException(404)
    order.status = status
    order.status_history = (order.status_history or []) + [{"status": status, "timestamp": datetime.now(timezone.utc).isoformat(), "actor": str(current_user.id)}]
    if status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.now(timezone.utc)
        order.review_unlocked = True
        from app.workers.commission_worker import settle_commissions_batch
        from app.workers.gamification_worker import award_order_wk
        award_order_wk.apply_async(args=[str(order.buyer_id), str(order_id), "buyer"])
        if order.koc_t1_id:
            award_order_wk.apply_async(args=[str(order.koc_t1_id), str(order_id), "koc_t1"])
    if status == OrderStatus.COMPLETED: order.completed_at = datetime.now(timezone.utc)
    db.add(order)
    return {"status": status, "order_id": str(order_id)}

@router.get("/{order_id}/tracking")
async def track_order(order_id: UUID, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order: raise HTTPException(404)
    return {"tracking_number": order.tracking_number, "carrier": order.shipping_carrier, "status": order.status, "history": order.status_history or []}

def _order_dict(o: Order) -> dict:
    return {"id": str(o.id), "order_number": o.order_number, "status": o.status, "total": float(o.total), "items": o.items, "payment_method": o.payment_method, "created_at": o.created_at.isoformat() if o.created_at else None, "delivered_at": o.delivered_at.isoformat() if o.delivered_at else None}
