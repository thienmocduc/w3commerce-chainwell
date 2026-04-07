"""
WellKOC -- Returns & Refunds Endpoints
POST /returns                   - buyer creates return request
GET  /returns                   - list return requests (role-filtered)
GET  /returns/{id}              - get return detail
PUT  /returns/{id}/decision     - vendor approves/rejects
POST /returns/{id}/refund       - admin processes refund
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.return_request import ReturnRequest, ReturnStatus, ReturnReason, RefundMethod
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/returns", tags=["Returns"])

RETURN_WINDOW_DAYS = 7


# ── Schemas ──────────────────────────────────────────────────

class CreateReturnReq(BaseModel):
    order_id: str
    reason: str = Field(..., description="damaged | wrong_item | not_as_described | other")
    description: Optional[str] = None
    photo_urls: Optional[list[str]] = []


class VendorDecisionReq(BaseModel):
    decision: str = Field(..., description="approved | rejected")
    vendor_response: Optional[str] = None
    refund_amount: Optional[float] = None


class ProcessRefundReq(BaseModel):
    refund_method: str = Field(..., description="original_payment | wallet_credit")
    refund_amount: Optional[float] = None


# ── Helpers ──────────────────────────────────────────────────

def _return_dict(r: ReturnRequest) -> dict:
    return {
        "id": str(r.id),
        "order_id": str(r.order_id),
        "buyer_id": str(r.buyer_id),
        "reason": r.reason,
        "description": r.description,
        "photo_urls": r.photo_urls or [],
        "status": r.status,
        "vendor_response": r.vendor_response,
        "refund_amount": float(r.refund_amount) if r.refund_amount else None,
        "refund_method": r.refund_method,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


# ── Endpoints ────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_return_request(
    body: CreateReturnReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Buyer creates a return request. Order must be delivered and within 7-day window."""
    # Validate reason
    valid_reasons = [r.value for r in ReturnReason]
    if body.reason not in valid_reasons:
        raise HTTPException(400, f"Lý do không hợp lệ. Chọn: {', '.join(valid_reasons)}")

    # Fetch order
    r = await db.execute(select(Order).where(Order.id == UUID(body.order_id)))
    order = r.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Đơn hàng không tồn tại")

    # Must be the buyer
    if str(order.buyer_id) != str(current_user.id):
        raise HTTPException(403, "Chỉ người mua mới có thể yêu cầu trả hàng")

    # Order must be delivered
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(400, "Chỉ có thể trả hàng khi đơn đã giao thành công")

    # Check 7-day return window
    if order.delivered_at:
        deadline = order.delivered_at + timedelta(days=RETURN_WINDOW_DAYS)
        if datetime.now(timezone.utc) > deadline.replace(tzinfo=timezone.utc):
            raise HTTPException(400, f"Đã quá thời hạn trả hàng ({RETURN_WINDOW_DAYS} ngày)")

    # Check for existing pending return request on this order
    existing = await db.execute(
        select(ReturnRequest).where(
            ReturnRequest.order_id == UUID(body.order_id),
            ReturnRequest.status.in_([ReturnStatus.PENDING, ReturnStatus.APPROVED]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Đã có yêu cầu trả hàng cho đơn này")

    return_req = ReturnRequest(
        order_id=UUID(body.order_id),
        buyer_id=current_user.id,
        reason=body.reason,
        description=body.description,
        photo_urls=body.photo_urls or [],
        status=ReturnStatus.PENDING,
    )
    db.add(return_req)
    await db.commit()

    return _return_dict(return_req)


@router.get("")
async def list_return_requests(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    *,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    List return requests.
    - Buyers see their own requests.
    - Vendors see requests for their orders.
    - Admins see all.
    """
    if current_user.is_admin:
        q = select(ReturnRequest)
    elif current_user.role == UserRole.VENDOR:
        # Vendor sees returns for orders where they are the vendor
        vendor_order_ids = select(Order.id).where(Order.vendor_id == current_user.id)
        q = select(ReturnRequest).where(ReturnRequest.order_id.in_(vendor_order_ids))
    else:
        q = select(ReturnRequest).where(ReturnRequest.buyer_id == current_user.id)

    if status:
        q = q.where(ReturnRequest.status == status)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page).order_by(ReturnRequest.created_at.desc())
    r = await db.execute(q)
    items = r.scalars().all()

    return {"items": [_return_dict(i) for i in items], "total": total, "page": page}


@router.get("/{return_id}")
async def get_return_request(
    return_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get return request detail. Buyer, vendor of the order, or admin."""
    r = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
    ret = r.scalar_one_or_none()
    if not ret:
        raise HTTPException(404, "Yêu cầu trả hàng không tồn tại")

    # Authorization: buyer, vendor of the order, or admin
    if not current_user.is_admin:
        if str(ret.buyer_id) != str(current_user.id):
            # Check if current user is the vendor of the order
            order_r = await db.execute(select(Order).where(Order.id == ret.order_id))
            order = order_r.scalar_one_or_none()
            if not order or str(order.vendor_id) != str(current_user.id):
                raise HTTPException(403, "Không có quyền xem yêu cầu này")

    return _return_dict(ret)


@router.put("/{return_id}/decision")
async def vendor_decision(
    return_id: UUID,
    body: VendorDecisionReq,
    current_user: User = Depends(require_role([UserRole.VENDOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Vendor approves or rejects a return request."""
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(400, "Quyết định phải là 'approved' hoặc 'rejected'")

    r = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
    ret = r.scalar_one_or_none()
    if not ret:
        raise HTTPException(404, "Yêu cầu trả hàng không tồn tại")

    if ret.status != ReturnStatus.PENDING:
        raise HTTPException(400, "Yêu cầu này đã được xử lý")

    # Verify vendor owns the order (unless admin)
    if not current_user.is_admin:
        order_r = await db.execute(select(Order).where(Order.id == ret.order_id))
        order = order_r.scalar_one_or_none()
        if not order or str(order.vendor_id) != str(current_user.id):
            raise HTTPException(403, "Không có quyền xử lý yêu cầu này")

    ret.status = body.decision
    ret.vendor_response = body.vendor_response
    if body.decision == ReturnStatus.APPROVED and body.refund_amount is not None:
        ret.refund_amount = body.refund_amount
    db.add(ret)
    await db.commit()

    return _return_dict(ret)


@router.post("/{return_id}/refund")
async def process_refund(
    return_id: UUID,
    body: ProcessRefundReq,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Admin processes the refund for an approved return request."""
    valid_methods = [m.value for m in RefundMethod]
    if body.refund_method not in valid_methods:
        raise HTTPException(400, f"Phương thức hoàn tiền không hợp lệ. Chọn: {', '.join(valid_methods)}")

    r = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
    ret = r.scalar_one_or_none()
    if not ret:
        raise HTTPException(404, "Yêu cầu trả hàng không tồn tại")

    if ret.status != ReturnStatus.APPROVED:
        raise HTTPException(400, "Yêu cầu chưa được duyệt hoặc đã hoàn tiền")

    # Update return request
    ret.status = ReturnStatus.REFUNDED
    ret.refund_method = body.refund_method
    if body.refund_amount is not None:
        ret.refund_amount = body.refund_amount
    db.add(ret)

    # Update order status to refunded
    order_r = await db.execute(select(Order).where(Order.id == ret.order_id))
    order = order_r.scalar_one_or_none()
    if order:
        order.status = OrderStatus.REFUNDED
        order.status_history = (order.status_history or []) + [
            {
                "status": "refunded",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "actor": str(current_user.id),
                "return_request_id": str(ret.id),
            }
        ]
        db.add(order)

    await db.commit()

    return {
        "refunded": True,
        "return_request": _return_dict(ret),
        "order_status": order.status if order else None,
    }
