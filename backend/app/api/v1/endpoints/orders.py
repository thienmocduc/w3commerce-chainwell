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
from app.models.product import Product as ProductModel

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

    # BUG#12 FIX: Validate price and vendor_id from DB — never trust client-side cart values
    validated_items = []
    vendor_id = None
    subtotal = 0
    for item in items:
        try:
            pid = UUID(str(item.get("product_id", "")))
        except (ValueError, AttributeError):
            raise HTTPException(400, f"product_id không hợp lệ: {item.get('product_id')}")
        prod_r = await db.execute(select(ProductModel).where(ProductModel.id == pid, ProductModel.status == "active"))
        prod = prod_r.scalar_one_or_none()
        if not prod:
            raise HTTPException(404, f"Sản phẩm {pid} không tồn tại hoặc đã ngừng bán")
        qty = max(1, int(item.get("quantity", 1)))
        # Overwrite price and vendor_id from trusted DB source
        item_copy = dict(item)
        item_copy["price"] = float(prod.price)
        item_copy["vendor_id"] = str(prod.vendor_id)
        item_copy["name"] = prod.name
        item_copy["quantity"] = qty
        validated_items.append(item_copy)
        subtotal += float(prod.price) * qty
        if vendor_id is None:
            vendor_id = prod.vendor_id  # primary vendor from first item
    items = validated_items

    order_num = f"ORD-{datetime.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    order = Order(
        order_number=order_num, buyer_id=current_user.id,
        vendor_id=vendor_id,
        items=items, subtotal=subtotal, total=subtotal,
        shipping_address=body.shipping_address, payment_method=body.payment_method,
        voucher_code=coupon, status=OrderStatus.PENDING,
        idempotency_key=idem_key,
        status_history=[{"status": "pending", "timestamp": datetime.now(timezone.utc).isoformat()}],
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

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
    # BUG#15 FIX: allow buyer OR vendor OR admin to view order
    is_buyer = str(order.buyer_id) == str(current_user.id)
    is_vendor = str(order.vendor_id) == str(current_user.id)
    if not (is_buyer or is_vendor or current_user.is_admin):
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
    # Vendors can only update their own orders
    if current_user.role == UserRole.VENDOR and str(order.vendor_id) != str(current_user.id):
        raise HTTPException(403, "Không có quyền cập nhật đơn hàng này")
    # BUG#11 FIX: Validate status is a valid OrderStatus enum value
    try:
        new_status = OrderStatus(status)
    except ValueError:
        raise HTTPException(400, f"Trạng thái '{status}' không hợp lệ")
    # Validate status transition
    valid_transitions = {
        OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        OrderStatus.CONFIRMED: [OrderStatus.PACKING, OrderStatus.CANCELLED],
        OrderStatus.PACKING: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
        OrderStatus.SHIPPING: [OrderStatus.DELIVERED],
        OrderStatus.DELIVERED: [OrderStatus.COMPLETED, OrderStatus.REFUNDING],
        OrderStatus.REFUNDING: [OrderStatus.REFUNDED, OrderStatus.DELIVERED],
    }
    try:
        current_status = OrderStatus(order.status)
    except ValueError:
        current_status = None
    if current_status in valid_transitions and new_status not in valid_transitions.get(current_status, []):
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(400, f"Không thể chuyển từ '{current_status}' sang '{new_status}'")
    order.status = new_status.value
    order.status_history = (order.status_history or []) + [{
        "status": new_status.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": str(current_user.id),
        "actor_role": current_user.role if isinstance(current_user.role, str) else current_user.role.value,
    }]
    if new_status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.now(timezone.utc)
        order.review_unlocked = True
        from app.workers.gamification_worker import award_order_wk
        award_order_wk.apply_async(args=[str(order.buyer_id), str(order_id), "buyer"])
        if order.koc_t1_id:
            award_order_wk.apply_async(args=[str(order.koc_t1_id), str(order_id), "koc_t1"])
    if new_status == OrderStatus.COMPLETED:
        order.completed_at = datetime.now(timezone.utc)
    db.add(order)
    await db.commit()
    return {"status": new_status.value, "order_id": str(order_id)}

@router.get("/{order_id}/tracking")
async def track_order(order_id: UUID, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order: raise HTTPException(404)
    return {"tracking_number": order.tracking_number, "carrier": order.shipping_carrier, "status": order.status, "history": order.status_history or []}


class CancelReq(BaseModel):
    reason: Optional[str] = None

@router.post("/{order_id}/cancel", status_code=200)
async def cancel_order(order_id: UUID, body: CancelReq, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Buyer cancels an order (only allowed if pending/confirmed)."""
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order: raise HTTPException(404, "Đơn hàng không tồn tại")
    if str(order.buyer_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(403, "Không có quyền huỷ đơn hàng này")
    cancellable = {OrderStatus.PENDING, OrderStatus.CONFIRMED}
    if order.status not in cancellable:
        raise HTTPException(400, f"Không thể huỷ đơn ở trạng thái '{order.status}'")
    order.status = OrderStatus.CANCELLED
    order.status_history = (order.status_history or []) + [{
        "status": OrderStatus.CANCELLED, "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": str(current_user.id), "reason": body.reason,
    }]
    db.add(order)
    await db.commit()
    return {"status": "cancelled", "order_id": str(order_id)}


class ReturnReq(BaseModel):
    reason: str
    description: Optional[str] = None

@router.post("/{order_id}/return", status_code=201)
async def request_return(order_id: UUID, body: ReturnReq, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Buyer requests a return/refund after delivery."""
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order: raise HTTPException(404, "Đơn hàng không tồn tại")
    if str(order.buyer_id) != str(current_user.id):
        raise HTTPException(403, "Không có quyền yêu cầu hoàn trả")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(400, "Chỉ có thể hoàn trả đơn hàng đã giao")
    # Create return request record
    from app.models.return_request import ReturnRequest
    ret = ReturnRequest(
        order_id=order_id, buyer_id=current_user.id,
        reason=body.reason, description=body.description,
    )
    db.add(ret)
    order.status = OrderStatus.REFUNDING
    db.add(order)
    await db.commit()
    await db.refresh(ret)
    return {"id": str(ret.id), "status": ret.status, "order_id": str(order_id)}


def _order_dict(o: Order) -> dict:
    return {"id": str(o.id), "order_number": o.order_number, "status": o.status, "total": float(o.total), "items": o.items, "payment_method": o.payment_method, "created_at": o.created_at.isoformat() if o.created_at else None, "delivered_at": o.delivered_at.isoformat() if o.delivered_at else None}
