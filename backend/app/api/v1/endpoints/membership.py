"""
WellKOC — Membership Billing Endpoints (Module #49)
GET  /membership/plans       List available plans with pricing
POST /membership/subscribe   Subscribe to a plan
GET  /membership/current     Get current subscription
POST /membership/cancel      Cancel subscription
GET  /membership/invoices    Billing history
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser
from app.models.membership import Membership
from app.models.user import User

router = APIRouter(prefix="/membership", tags=["Membership"])


# ── Plan Definitions ─────────────────────────────────────────

MEMBERSHIP_PLANS = [
    {
        "id": "free",
        "name": "Free",
        "name_vi": "Miễn Phí",
        "price_vnd": 0,
        "billing_cycle": "none",
        "perks": {
            "commission_rate_boost": 0,
            "max_affiliate_links": 5,
            "priority_support": False,
            "analytics_dashboard": False,
            "featured_badge": False,
            "early_access": False,
        },
    },
    {
        "id": "bronze",
        "name": "Bronze",
        "name_vi": "Đồng",
        "price_vnd": 299_000,
        "billing_cycle": "monthly",
        "perks": {
            "commission_rate_boost": 0.02,
            "max_affiliate_links": 20,
            "priority_support": False,
            "analytics_dashboard": True,
            "featured_badge": False,
            "early_access": False,
        },
    },
    {
        "id": "silver",
        "name": "Silver",
        "name_vi": "Bạc",
        "price_vnd": 599_000,
        "billing_cycle": "monthly",
        "perks": {
            "commission_rate_boost": 0.05,
            "max_affiliate_links": 50,
            "priority_support": True,
            "analytics_dashboard": True,
            "featured_badge": False,
            "early_access": False,
        },
    },
    {
        "id": "gold",
        "name": "Gold",
        "name_vi": "Vàng",
        "price_vnd": 999_000,
        "billing_cycle": "monthly",
        "perks": {
            "commission_rate_boost": 0.08,
            "max_affiliate_links": 200,
            "priority_support": True,
            "analytics_dashboard": True,
            "featured_badge": True,
            "early_access": True,
        },
    },
    {
        "id": "diamond",
        "name": "Diamond",
        "name_vi": "Kim Cương",
        "price_vnd": 1_999_000,
        "billing_cycle": "monthly",
        "perks": {
            "commission_rate_boost": 0.12,
            "max_affiliate_links": -1,  # unlimited
            "priority_support": True,
            "analytics_dashboard": True,
            "featured_badge": True,
            "early_access": True,
            "dedicated_account_manager": True,
            "custom_storefront": True,
        },
    },
]

PLAN_MAP = {p["id"]: p for p in MEMBERSHIP_PLANS}


# ── Schemas ──────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    plan_id: str = Field(..., description="Plan ID: free, bronze, silver, gold, diamond")
    payment_method: Optional[str] = Field("vnpay", description="Payment method for billing")


class MembershipOut(BaseModel):
    id: UUID
    tier: str
    price_vnd: float
    billing_cycle: str
    is_active: bool
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    perks: Optional[dict] = None

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    id: UUID
    tier: str
    price_vnd: float
    billing_cycle: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


# ── Endpoints ────────────────────────────────────────────────

@router.get("/plans")
async def list_plans():
    """List all available membership plans with pricing and perks."""
    return {
        "plans": MEMBERSHIP_PLANS,
        "currency": "VND",
    }


@router.post("/subscribe", status_code=201)
async def subscribe(
    body: SubscribeRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Subscribe to a membership plan.
    - Deactivates any existing active subscription
    - Creates new subscription record
    - Updates user.membership_tier
    """
    plan = PLAN_MAP.get(body.plan_id)
    if not plan:
        raise HTTPException(400, f"Gói không hợp lệ. Chọn: {', '.join(PLAN_MAP.keys())}")

    # If subscribing to free, just cancel active sub
    if body.plan_id == "free":
        await _deactivate_current(current_user.id, db)
        current_user.membership_tier = "free"
        current_user.membership_expires_at = None
        db.add(current_user)
        await db.commit()
        return {"status": "subscribed", "plan": "free", "price_vnd": 0}

    # Deactivate existing subscription
    await _deactivate_current(current_user.id, db)

    # Calculate expiry (30 days from now for monthly)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=30)

    membership = Membership(
        user_id=current_user.id,
        tier=plan["id"],
        price_vnd=plan["price_vnd"],
        billing_cycle=plan["billing_cycle"],
        started_at=now,
        expires_at=expires_at,
        is_active=True,
        perks=plan["perks"],
    )
    db.add(membership)

    # Update user record
    current_user.membership_tier = plan["id"]
    current_user.membership_expires_at = expires_at
    db.add(current_user)

    await db.commit()

    return {
        "status": "subscribed",
        "plan": plan["id"],
        "price_vnd": plan["price_vnd"],
        "expires_at": expires_at.isoformat(),
        "perks": plan["perks"],
        "membership_id": str(membership.id),
    }


@router.get("/current", response_model=Optional[MembershipOut])
async def current_subscription(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get the user's current active subscription."""
    result = await db.execute(
        select(Membership).where(
            Membership.user_id == current_user.id,
            Membership.is_active == True,
        ).order_by(desc(Membership.created_at)).limit(1)
    )
    membership = result.scalar_one_or_none()

    if not membership:
        # Return free tier info
        return {
            "id": "00000000-0000-0000-0000-000000000000",
            "tier": "free",
            "price_vnd": 0,
            "billing_cycle": "none",
            "is_active": True,
            "started_at": current_user.created_at,
            "expires_at": None,
            "perks": PLAN_MAP["free"]["perks"],
        }

    return MembershipOut.model_validate(membership)


@router.post("/cancel")
async def cancel_subscription(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Cancel current active subscription. Reverts to free tier."""
    deactivated = await _deactivate_current(current_user.id, db)

    current_user.membership_tier = "free"
    current_user.membership_expires_at = None
    db.add(current_user)
    await db.commit()

    if not deactivated:
        return {"status": "no_active_subscription", "tier": "free"}

    return {"status": "cancelled", "tier": "free", "message": "Đã huỷ gói thành viên"}


@router.get("/invoices")
async def billing_history(
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List billing history (all subscription records) for current user."""
    offset = (page - 1) * per_page

    # Count
    from sqlalchemy import func as sqlfunc
    count_q = select(sqlfunc.count()).select_from(Membership).where(
        Membership.user_id == current_user.id
    )
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch
    q = (
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .order_by(desc(Membership.created_at))
        .offset(offset)
        .limit(per_page)
    )
    rows = (await db.execute(q)).scalars().all()

    invoices = [
        {
            "id": str(m.id),
            "tier": m.tier,
            "price_vnd": float(m.price_vnd),
            "billing_cycle": m.billing_cycle,
            "started_at": m.started_at.isoformat() if m.started_at else None,
            "expires_at": m.expires_at.isoformat() if m.expires_at else None,
            "is_active": m.is_active,
        }
        for m in rows
    ]

    return {
        "items": invoices,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# ── Helpers ──────────────────────────────────────────────────

async def _deactivate_current(user_id, db: AsyncSession) -> bool:
    """Deactivate all active memberships for user. Returns True if any were deactivated."""
    result = await db.execute(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.is_active == True,
        )
    )
    active_subs = result.scalars().all()
    if not active_subs:
        return False

    for sub in active_subs:
        sub.is_active = False
        db.add(sub)

    return True
