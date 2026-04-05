"""
WellKOC — Admin Endpoints
Full platform control: users, KYC, orders, commissions, agents, blockchain
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role
from app.models.user import User, UserRole, KYCStatus
from app.models.order import Order, Commission, CommissionStatus

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_only = require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])


# ── Dashboard Overview ────────────────────────────────────────
@router.get("/dashboard")
async def admin_dashboard(
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Real-time platform metrics for admin control panel"""
    # User counts by role
    user_counts = {}
    for role in [UserRole.BUYER, UserRole.KOC, UserRole.VENDOR]:
        r = await db.execute(select(func.count(User.id)).where(User.role == role, User.is_active == True))
        user_counts[role] = r.scalar() or 0

    # Commission stats
    r = await db.execute(
        select(func.sum(Commission.amount), func.count(Commission.id))
        .where(Commission.status == CommissionStatus.SETTLED)
    )
    comm_total, comm_count = r.one()

    # Pending KYC
    r = await db.execute(select(func.count(User.id)).where(User.kyc_status == KYCStatus.PROCESSING))
    kyc_pending = r.scalar() or 0

    # Today's orders
    from datetime import datetime, timezone, timedelta
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    r = await db.execute(
        select(func.count(Order.id), func.sum(Order.total))
        .where(Order.created_at >= today)
    )
    orders_today, gmv_today = r.one()

    return {
        "users": user_counts,
        "kyc_pending": kyc_pending,
        "commissions": {
            "total_settled_vnd": float(comm_total or 0),
            "total_count": comm_count or 0,
        },
        "today": {
            "orders": orders_today or 0,
            "gmv_vnd": float(gmv_today or 0),
        },
        "system": {
            "ai_agents_online": 108,  # TODO: real agent status
            "polygon_block": 48392014,  # TODO: real chain data
        },
    }


# ── User Management ───────────────────────────────────────────
@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    kyc_status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    q = select(User)
    if role:
        q = q.where(User.role == role)
    if kyc_status:
        q = q.where(User.kyc_status == kyc_status)
    if search:
        q = q.where(
            (User.email.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%")) |
            (User.display_name.ilike(f"%{search}%"))
        )

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page).order_by(User.created_at.desc())
    r = await db.execute(q)
    users = r.scalars().all()

    return {
        "items": [_user_dict(u) for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.put("/users/{user_id}/suspend")
async def suspend_user(
    user_id: UUID,
    reason: str,
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(403, "Cannot suspend super admin")
    user.is_active = False
    db.add(user)
    await db.commit()

    # Audit log
    from app.core.redis_client import redis_client
    await redis_client.lpush(
        "audit:admin",
        f"{current_user.id}|suspend_user|{user_id}|{reason}"
    )
    return {"status": "suspended", "user_id": str(user_id)}


# ── KYC Queue ────────────────────────────────────────────────
@router.get("/kyc/queue")
async def kyc_queue(
    page: int = Query(1, ge=1),
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    q = select(User).where(User.kyc_status == KYCStatus.PROCESSING).offset((page - 1) * 20).limit(20)
    r = await db.execute(q)
    users = r.scalars().all()
    return {"items": [_user_dict(u) for u in users]}


@router.put("/kyc/{user_id}/review")
async def review_kyc(
    user_id: UUID,
    approved: bool,
    rejection_reason: Optional[str] = None,
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.kyc_status = KYCStatus.APPROVED if approved else KYCStatus.REJECTED
    user.kyc_reviewed_at = datetime.now(timezone.utc)
    user.kyc_reviewer_id = current_user.id
    if not approved and rejection_reason:
        user.kyc_data = {**(user.kyc_data or {}), "rejection_reason": rejection_reason}
    db.add(user)
    await db.commit()

    # TODO: Send notification to user (email/SMS)
    return {"status": "approved" if approved else "rejected", "user_id": str(user_id)}


# ── Commission Monitor ────────────────────────────────────────
@router.get("/commissions/pending")
async def pending_commissions(
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    from app.models.order import CommissionStatus
    r = await db.execute(
        select(func.count(Commission.id), func.sum(Commission.amount))
        .where(Commission.status.in_([CommissionStatus.QUEUED, CommissionStatus.SETTLING]))
    )
    count, total = r.one()
    return {"pending_count": count or 0, "pending_amount_vnd": float(total or 0)}


# ── Overview alias ───────────────────────────────────────────
@router.get("/overview")
async def admin_overview(
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Alias for /admin/dashboard — same real-time platform metrics."""
    return await admin_dashboard(current_user=current_user, db=db)


# ── Helpers ───────────────────────────────────────────────────
def _user_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "phone": u.phone,
        "role": u.role,
        "display_name": u.display_name,
        "kyc_status": u.kyc_status,
        "is_active": u.is_active,
        "membership_tier": u.membership_tier,
        "total_commission_earned": float(u.total_commission_earned),
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "reputation_score": u.reputation_score,
    }
