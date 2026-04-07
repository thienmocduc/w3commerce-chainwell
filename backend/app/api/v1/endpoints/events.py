"""
WellKOC — Social Shopping Events Endpoints (Module #40: Mega Sale)
CRUD, join, leaderboard, NFT awards for mega-sale campaigns.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.user import UserRole
from app.models.shopping_event import (
    ShoppingEvent, EventStatus, EventParticipant, EventLeaderboardEntry,
)

router = APIRouter(prefix="/events", tags=["Social Shopping Events"])


# ── Schemas ──────────────────────────────────────────────────

class EventCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    banner_url: Optional[str] = None
    start_at: datetime
    end_at: datetime
    product_ids: list[str] = Field(default_factory=list)
    koc_ids: Optional[list[str]] = None
    commission_split: Optional[dict] = None
    target_gmv: float = 0
    nft_rewards: Optional[dict] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    banner_url: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    product_ids: Optional[list[str]] = None
    koc_ids: Optional[list[str]] = None
    commission_split: Optional[dict] = None
    target_gmv: Optional[float] = None
    nft_rewards: Optional[dict] = None
    status: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────

def _serialize_event(e: ShoppingEvent) -> dict:
    return {
        "id": str(e.id),
        "title": e.title,
        "description": e.description,
        "banner_url": e.banner_url,
        "start_at": e.start_at.isoformat() if e.start_at else None,
        "end_at": e.end_at.isoformat() if e.end_at else None,
        "product_ids": e.product_ids,
        "koc_ids": e.koc_ids,
        "commission_split": e.commission_split,
        "status": e.status,
        "target_gmv": float(e.target_gmv),
        "actual_gmv": float(e.actual_gmv),
        "total_orders": e.total_orders,
        "total_participants": e.total_participants,
        "commission_pool": float(e.commission_pool),
        "nft_rewards_config": e.nft_rewards_config,
        "created_by": str(e.created_by),
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


# ── Endpoints ────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    current_user=Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Create a new social shopping event (admin only)."""
    if body.end_at <= body.start_at:
        raise HTTPException(400, "end_at phải sau start_at")

    event = ShoppingEvent(
        title=body.title,
        description=body.description,
        banner_url=body.banner_url,
        start_at=body.start_at,
        end_at=body.end_at,
        product_ids=body.product_ids,
        koc_ids=body.koc_ids,
        commission_split=body.commission_split,
        target_gmv=body.target_gmv,
        nft_rewards_config=body.nft_rewards,
        status=EventStatus.DRAFT,
        created_by=current_user.id,
    )
    db.add(event)
    await db.commit()
    return _serialize_event(event)


@router.get("")
async def list_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List events. Filter by status: active, upcoming, past, draft."""
    now = datetime.now(timezone.utc)
    q = select(ShoppingEvent)

    if status_filter == "active":
        q = q.where(
            ShoppingEvent.status == EventStatus.ACTIVE,
            ShoppingEvent.start_at <= now,
            ShoppingEvent.end_at >= now,
        )
    elif status_filter == "upcoming":
        q = q.where(
            ShoppingEvent.status.in_([EventStatus.DRAFT, EventStatus.ACTIVE]),
            ShoppingEvent.start_at > now,
        )
    elif status_filter == "past":
        q = q.where(ShoppingEvent.end_at < now)
    elif status_filter == "draft":
        q = q.where(ShoppingEvent.status == EventStatus.DRAFT)
    elif status_filter:
        q = q.where(ShoppingEvent.status == status_filter)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.order_by(ShoppingEvent.start_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    events = result.scalars().all()

    return {
        "items": [_serialize_event(e) for e in events],
        "total": total,
        "page": page,
    }


@router.get("/{event_id}")
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Event detail with real-time stats."""
    result = await db.execute(
        select(ShoppingEvent).where(ShoppingEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event không tồn tại")

    # Count participants
    p_count = await db.execute(
        select(func.count()).where(EventParticipant.event_id == event_id)
    )

    data = _serialize_event(event)
    data["live_participants"] = p_count.scalar() or 0
    data["gmv_progress"] = (
        round(float(event.actual_gmv) / float(event.target_gmv) * 100, 2)
        if event.target_gmv > 0 else 0
    )
    return data


@router.post("/{event_id}/join")
async def join_event(
    event_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """KOC joins a shopping event."""
    if current_user.role not in (UserRole.KOC, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Chỉ KOC mới được tham gia sự kiện")

    # Check event exists and is active
    result = await db.execute(
        select(ShoppingEvent).where(ShoppingEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event không tồn tại")
    if event.status != EventStatus.ACTIVE:
        raise HTTPException(400, "Event chưa hoạt động hoặc đã kết thúc")

    # Check not already joined
    existing = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.koc_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Bạn đã tham gia sự kiện này rồi")

    participant = EventParticipant(
        event_id=event_id,
        koc_id=current_user.id,
    )
    db.add(participant)

    # Also create leaderboard entry
    lb_entry = EventLeaderboardEntry(
        event_id=event_id,
        koc_id=current_user.id,
        score=0,
        orders=0,
        gmv=0,
        rank=0,
    )
    db.add(lb_entry)

    # Update participant count
    await db.execute(
        update(ShoppingEvent)
        .where(ShoppingEvent.id == event_id)
        .values(total_participants=ShoppingEvent.total_participants + 1)
    )
    await db.commit()

    return {
        "message": "Tham gia sự kiện thành công",
        "event_id": str(event_id),
        "koc_id": str(current_user.id),
        "joined_at": participant.joined_at.isoformat() if participant.joined_at else None,
    }


@router.get("/{event_id}/leaderboard")
async def event_leaderboard(
    event_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Live leaderboard — KOC rankings by sales during event."""
    result = await db.execute(
        select(EventLeaderboardEntry)
        .where(EventLeaderboardEntry.event_id == event_id)
        .order_by(EventLeaderboardEntry.gmv.desc())
        .limit(limit)
    )
    entries = result.scalars().all()

    # Assign live ranks
    ranked = []
    for idx, entry in enumerate(entries, start=1):
        ranked.append({
            "rank": idx,
            "koc_id": str(entry.koc_id),
            "score": float(entry.score),
            "orders": entry.orders,
            "gmv": float(entry.gmv),
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
        })

    return {"event_id": str(event_id), "leaderboard": ranked, "total": len(ranked)}


@router.post("/{event_id}/awards")
async def trigger_nft_awards(
    event_id: uuid.UUID,
    current_user=Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Admin triggers NFT award minting for top performers."""
    result = await db.execute(
        select(ShoppingEvent).where(ShoppingEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event không tồn tại")
    if event.status not in (EventStatus.ENDED, EventStatus.ACTIVE):
        raise HTTPException(400, "Event cần ở trạng thái đã kết thúc hoặc đang hoạt động")

    # Get top performers from leaderboard
    lb_result = await db.execute(
        select(EventLeaderboardEntry)
        .where(EventLeaderboardEntry.event_id == event_id)
        .order_by(EventLeaderboardEntry.gmv.desc())
        .limit(50)
    )
    entries = lb_result.scalars().all()

    rewards_config = event.nft_rewards_config or {}
    awards_issued = []

    for idx, entry in enumerate(entries, start=1):
        # Determine which tier this rank falls into
        tier_key = None
        if f"top_{idx}" in rewards_config:
            tier_key = f"top_{idx}"
        elif idx <= 10 and "top_10" in rewards_config:
            tier_key = "top_10"
        elif idx <= 50 and "top_50" in rewards_config:
            tier_key = "top_50"

        if tier_key:
            # In production: call NFT minting contract
            mock_token_id = 900000 + idx
            await db.execute(
                update(EventParticipant)
                .where(and_(
                    EventParticipant.event_id == event_id,
                    EventParticipant.koc_id == entry.koc_id,
                ))
                .values(nft_award_token_id=mock_token_id, rank=idx)
            )
            awards_issued.append({
                "koc_id": str(entry.koc_id),
                "rank": idx,
                "tier": tier_key,
                "token_id": mock_token_id,
            })

    await db.commit()
    return {
        "event_id": str(event_id),
        "awards_issued": len(awards_issued),
        "awards": awards_issued,
    }


@router.get("/{event_id}/stats")
async def event_stats(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Detailed event performance metrics."""
    result = await db.execute(
        select(ShoppingEvent).where(ShoppingEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event không tồn tại")

    # Participant stats
    p_result = await db.execute(
        select(
            func.count(EventParticipant.id),
            func.sum(EventParticipant.orders_count),
            func.sum(EventParticipant.gmv_contributed),
            func.sum(EventParticipant.commission_earned),
            func.avg(EventParticipant.gmv_contributed),
        ).where(EventParticipant.event_id == event_id)
    )
    p_stats = p_result.one()

    # Top performer
    top_result = await db.execute(
        select(EventLeaderboardEntry)
        .where(EventLeaderboardEntry.event_id == event_id)
        .order_by(EventLeaderboardEntry.gmv.desc())
        .limit(1)
    )
    top = top_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    elapsed = None
    remaining = None
    if event.start_at and event.end_at:
        if now >= event.start_at.replace(tzinfo=timezone.utc):
            elapsed_s = (min(now, event.end_at.replace(tzinfo=timezone.utc)) - event.start_at.replace(tzinfo=timezone.utc)).total_seconds()
            elapsed = round(elapsed_s / 3600, 2)
        if now < event.end_at.replace(tzinfo=timezone.utc):
            remaining_s = (event.end_at.replace(tzinfo=timezone.utc) - max(now, event.start_at.replace(tzinfo=timezone.utc))).total_seconds()
            remaining = round(remaining_s / 3600, 2)

    return {
        "event_id": str(event_id),
        "title": event.title,
        "status": event.status,
        "target_gmv": float(event.target_gmv),
        "actual_gmv": float(event.actual_gmv),
        "gmv_progress_pct": (
            round(float(event.actual_gmv) / float(event.target_gmv) * 100, 2)
            if event.target_gmv > 0 else 0
        ),
        "total_orders": event.total_orders,
        "total_participants": p_stats[0] or 0,
        "total_gmv_from_participants": float(p_stats[2] or 0),
        "total_commission_earned": float(p_stats[3] or 0),
        "avg_gmv_per_koc": float(p_stats[4] or 0),
        "commission_pool": float(event.commission_pool),
        "top_performer": {
            "koc_id": str(top.koc_id),
            "gmv": float(top.gmv),
            "orders": top.orders,
        } if top else None,
        "elapsed_hours": elapsed,
        "remaining_hours": remaining,
    }
