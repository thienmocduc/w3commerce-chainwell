"""
WellKOC — Group Buy Endpoints (Module #32)
Tiered group purchasing campaigns with atomic join counters
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role, Pagination
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.group_buy import GroupBuy, GroupBuyParticipant, GroupBuyStatus

router = APIRouter(prefix="/groupbuy", tags=["Group Buy"])


# ── Schemas ──────────────────────────────────────────────────

class TierSchema(BaseModel):
    min_qty: int = Field(..., ge=2, description="Minimum quantity to unlock this tier")
    discount_percent: float = Field(..., gt=0, le=80, description="Discount percentage")
    name: str = Field(..., max_length=50, description="Tier display name")


class GroupBuyCreate(BaseModel):
    product_id: uuid.UUID
    tiers: list[TierSchema] = Field(..., min_length=1, max_length=5)
    duration_hours: int = Field(48, ge=1, le=720, description="Campaign duration in hours")
    max_participants: int = Field(100, ge=2, le=10000)


class GroupBuyJoin(BaseModel):
    quantity: int = Field(1, ge=1, le=100)


class ParticipantOut(BaseModel):
    id: str
    user_id: str
    quantity: int
    tier_at_join: Optional[str]
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupBuyOut(BaseModel):
    id: str
    product_id: str
    creator_id: str
    status: str
    tiers: list[dict]
    current_count: int
    max_participants: int
    duration_hours: int
    starts_at: datetime
    expires_at: datetime
    current_tier: Optional[dict] = None
    next_tier: Optional[dict] = None
    progress_percent: float = 0.0
    participants_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupBuyDetailOut(GroupBuyOut):
    participants: list[ParticipantOut] = []


# ── Endpoints ────────────────────────────────────────────────

@router.post("", response_model=GroupBuyOut, status_code=status.HTTP_201_CREATED)
async def create_group_buy(
    body: GroupBuyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new group buy campaign for a product"""
    # Verify product exists and is active
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    if product.status != "active":
        raise HTTPException(400, "Product must be active to create a group buy")

    # Check for existing active group buy on same product
    existing = await db.execute(
        select(GroupBuy).where(
            GroupBuy.product_id == body.product_id,
            GroupBuy.status == GroupBuyStatus.ACTIVE,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "An active group buy already exists for this product")

    # Validate tier ordering
    sorted_tiers = sorted([t.model_dump() for t in body.tiers], key=lambda x: x["min_qty"])
    now = datetime.utcnow()

    group_buy = GroupBuy(
        product_id=body.product_id,
        creator_id=current_user.id,
        tiers=sorted_tiers,
        duration_hours=body.duration_hours,
        max_participants=body.max_participants,
        starts_at=now,
        expires_at=now + timedelta(hours=body.duration_hours),
    )
    db.add(group_buy)
    await db.commit()
    await db.refresh(group_buy)

    return _build_group_buy_out(group_buy)


@router.get("", response_model=list[GroupBuyOut])
async def list_group_buys(
    status_filter: Optional[str] = "active",
    *,
    pagination: Pagination,
    db: AsyncSession = Depends(get_db),
):
    """List group buy campaigns, defaults to active only"""
    query = select(GroupBuy).order_by(GroupBuy.created_at.desc())
    if status_filter:
        query = query.where(GroupBuy.status == status_filter)
    query = query.offset(pagination.offset).limit(pagination.per_page)

    result = await db.execute(query)
    group_buys = result.scalars().all()

    # Auto-expire any that have passed their expiry time
    expired_ids = []
    for gb in group_buys:
        if gb.status == GroupBuyStatus.ACTIVE and gb.expires_at < datetime.utcnow():
            gb.status = GroupBuyStatus.EXPIRED
            expired_ids.append(gb.id)
    if expired_ids:
        await db.commit()

    return [_build_group_buy_out(gb) for gb in group_buys]


@router.get("/{group_buy_id}", response_model=GroupBuyDetailOut)
async def get_group_buy(
    group_buy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get group buy detail with real-time progress and participants"""
    result = await db.execute(
        select(GroupBuy).where(GroupBuy.id == group_buy_id)
    )
    gb = result.scalar_one_or_none()
    if not gb:
        raise HTTPException(404, "Group buy not found")

    # Auto-expire if needed
    if gb.status == GroupBuyStatus.ACTIVE and gb.expires_at < datetime.utcnow():
        gb.status = GroupBuyStatus.EXPIRED
        await db.commit()
        await db.refresh(gb)

    out = _build_group_buy_detail(gb)
    return out


@router.post("/{group_buy_id}/join", response_model=GroupBuyDetailOut)
async def join_group_buy(
    group_buy_id: uuid.UUID,
    body: GroupBuyJoin,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a group buy campaign (atomic counter increment)"""
    result = await db.execute(
        select(GroupBuy).where(GroupBuy.id == group_buy_id)
    )
    gb = result.scalar_one_or_none()
    if not gb:
        raise HTTPException(404, "Group buy not found")

    if gb.status != GroupBuyStatus.ACTIVE:
        raise HTTPException(400, f"Group buy is {gb.status}, cannot join")

    if gb.expires_at < datetime.utcnow():
        gb.status = GroupBuyStatus.EXPIRED
        await db.commit()
        raise HTTPException(400, "Group buy has expired")

    if gb.current_count + body.quantity > gb.max_participants:
        raise HTTPException(400, "Not enough spots remaining in this group buy")

    # Check if user already joined
    existing = await db.execute(
        select(GroupBuyParticipant).where(
            GroupBuyParticipant.group_buy_id == group_buy_id,
            GroupBuyParticipant.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "You have already joined this group buy")

    # Atomic counter update
    await db.execute(
        update(GroupBuy)
        .where(GroupBuy.id == group_buy_id)
        .values(current_count=GroupBuy.current_count + body.quantity)
    )

    # Determine current tier name at join time
    new_count = gb.current_count + body.quantity
    tier_name = None
    sorted_tiers = sorted(gb.tiers, key=lambda t: t["min_qty"], reverse=True)
    for tier in sorted_tiers:
        if new_count >= tier["min_qty"]:
            tier_name = tier.get("name")
            break

    participant = GroupBuyParticipant(
        group_buy_id=group_buy_id,
        user_id=current_user.id,
        quantity=body.quantity,
        tier_at_join=tier_name,
    )
    db.add(participant)

    # Check if max reached -> mark completed
    if new_count >= gb.max_participants:
        await db.execute(
            update(GroupBuy)
            .where(GroupBuy.id == group_buy_id)
            .values(status=GroupBuyStatus.COMPLETED, completed_at=func.now())
        )

    await db.commit()
    await db.refresh(gb)

    return _build_group_buy_detail(gb)


@router.put("/{group_buy_id}/cancel", response_model=GroupBuyOut)
async def cancel_group_buy(
    group_buy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a group buy (creator or admin only)"""
    result = await db.execute(
        select(GroupBuy).where(GroupBuy.id == group_buy_id)
    )
    gb = result.scalar_one_or_none()
    if not gb:
        raise HTTPException(404, "Group buy not found")

    # Only creator or admin can cancel
    if gb.creator_id != current_user.id and current_user.role not in (
        UserRole.ADMIN, UserRole.SUPER_ADMIN
    ):
        raise HTTPException(403, "Only the creator or an admin can cancel this group buy")

    if gb.status != GroupBuyStatus.ACTIVE:
        raise HTTPException(400, f"Cannot cancel a group buy with status: {gb.status}")

    gb.status = GroupBuyStatus.CANCELLED
    gb.cancelled_at = datetime.utcnow()
    await db.commit()
    await db.refresh(gb)

    return _build_group_buy_out(gb)


# ── Helpers ──────────────────────────────────────────────────

def _build_group_buy_out(gb: GroupBuy) -> GroupBuyOut:
    first_tier_min = min(t["min_qty"] for t in gb.tiers) if gb.tiers else 1
    progress = min(100.0, (gb.current_count / first_tier_min) * 100) if first_tier_min > 0 else 0.0

    return GroupBuyOut(
        id=str(gb.id),
        product_id=str(gb.product_id),
        creator_id=str(gb.creator_id),
        status=gb.status,
        tiers=gb.tiers,
        current_count=gb.current_count,
        max_participants=gb.max_participants,
        duration_hours=gb.duration_hours,
        starts_at=gb.starts_at,
        expires_at=gb.expires_at,
        current_tier=gb.current_tier,
        next_tier=gb.next_tier,
        progress_percent=round(progress, 1),
        participants_count=len(gb.participants) if gb.participants else 0,
        created_at=gb.created_at,
    )


def _build_group_buy_detail(gb: GroupBuy) -> GroupBuyDetailOut:
    base = _build_group_buy_out(gb)
    participants = [
        ParticipantOut(
            id=str(p.id),
            user_id=str(p.user_id),
            quantity=p.quantity,
            tier_at_join=p.tier_at_join,
            joined_at=p.joined_at,
        )
        for p in (gb.participants or [])
    ]
    return GroupBuyDetailOut(**base.model_dump(), participants=participants)
