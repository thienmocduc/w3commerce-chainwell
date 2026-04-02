"""
WellKOC — Pool A/B/C Weekly Ranking Endpoints (Module #18)
GET  /pools/rankings         Weekly rankings (query: week, year, pool)
GET  /pools/{pool}/members   List members of a specific pool
GET  /pools/my-rank          Current user's ranking position
POST /pools/snapshot         Admin triggers weekly snapshot (cron Monday 00:00)
GET  /pools/distributions    Distribution history (on-chain TX records)
POST /pools/distribute       Admin triggers on-chain distribution for a week
"""
import uuid
from datetime import datetime, date, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role, Pagination, CurrentUser
from app.models.user import User, UserRole
from app.models.pool_ranking import (
    PoolRanking, PoolConfig, PoolDistribution,
    PoolTier, SCORE_WEIGHTS, POOL_CONFIG_DEFAULTS,
)

router = APIRouter(prefix="/pools", tags=["Pool Rankings"])


# ── Schemas ──────────────────────────────────────────────────

class PoolRankingOut(BaseModel):
    id: str
    koc_id: str
    week: int
    year: int
    pool: str
    rank: int
    score: float
    orders_count: int
    gmv: float
    cvr: float
    dpp_sales: int
    commission_amount: float
    tx_hash: Optional[str] = None
    distributed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SnapshotRequest(BaseModel):
    week: Optional[int] = Field(None, ge=1, le=53, description="ISO week number, defaults to current")
    year: Optional[int] = Field(None, ge=2024, le=2030, description="Year, defaults to current")


class DistributeRequest(BaseModel):
    week: int = Field(..., ge=1, le=53)
    year: int = Field(..., ge=2024, le=2030)
    pool: Optional[str] = Field(None, description="A/B/C or None for all pools")
    total_pool_amount: float = Field(..., gt=0, description="Total commission pool amount to distribute")


class DistributionOut(BaseModel):
    id: str
    week: int
    year: int
    pool: str
    total_amount: float
    recipients_count: int
    tx_hash: Optional[str] = None
    status: str
    distributed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MyRankOut(BaseModel):
    week: int
    year: int
    pool: Optional[str] = None
    rank: Optional[int] = None
    score: Optional[float] = None
    orders_count: Optional[int] = None
    gmv: Optional[float] = None
    cvr: Optional[float] = None
    dpp_sales: Optional[int] = None
    commission_amount: Optional[float] = None
    tx_hash: Optional[str] = None
    ranked: bool = False


# ── Helpers ──────────────────────────────────────────────────

def _current_iso_week() -> tuple[int, int]:
    """Return (week, year) for the current ISO week."""
    today = date.today()
    iso = today.isocalendar()
    return iso.week, iso.year


def _compute_score(orders: int, gmv: float, cvr: float, dpp_sales: int) -> float:
    return (
        orders * SCORE_WEIGHTS["orders"]
        + gmv * SCORE_WEIGHTS["gmv"]
        + cvr * SCORE_WEIGHTS["cvr"]
        + dpp_sales * SCORE_WEIGHTS["dpp_sales"]
    )


def _assign_pool(rank: int) -> Optional[str]:
    """Assign pool tier based on overall rank position."""
    for tier, cfg in POOL_CONFIG_DEFAULTS.items():
        if cfg["min_rank"] <= rank <= cfg["max_rank"]:
            return tier.value
    return None


# ── Endpoints ────────────────────────────────────────────────

@router.get("/rankings")
async def get_rankings(
    week: Optional[int] = Query(None, ge=1, le=53),
    year: Optional[int] = Query(None, ge=2024, le=2030),
    pool: Optional[str] = Query(None, description="A, B, C, or all"),
    pagination: Pagination = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Weekly rankings with pool breakdown.
    Pool A = Top 1-10 (40%), Pool B = Top 11-50 (35%), Pool C = Top 51-200 (25%)
    Score = orders x 1 + GMV x 0.5 + CVR x 2 + DPP_sales x 1.5
    """
    w, y = _current_iso_week()
    week = week or w
    year = year or y

    query = (
        select(PoolRanking)
        .where(PoolRanking.week == week, PoolRanking.year == year)
        .order_by(PoolRanking.rank.asc())
    )

    if pool and pool.upper() in ("A", "B", "C"):
        query = query.where(PoolRanking.pool == pool.upper())

    query = query.offset(pagination.offset).limit(pagination.per_page)
    result = await db.execute(query)
    rankings = result.scalars().all()

    # Count totals per pool
    count_q = (
        select(PoolRanking.pool, func.count(PoolRanking.id))
        .where(PoolRanking.week == week, PoolRanking.year == year)
        .group_by(PoolRanking.pool)
    )
    count_r = await db.execute(count_q)
    pool_counts = dict(count_r.all())

    return {
        "week": week,
        "year": year,
        "pool_filter": pool,
        "pool_counts": pool_counts,
        "pool_config": {
            "A": {"percentage": 40, "ranks": "1-10"},
            "B": {"percentage": 35, "ranks": "11-50"},
            "C": {"percentage": 25, "ranks": "51-200"},
        },
        "score_formula": "orders x 1 + GMV x 0.5 + CVR x 2 + DPP_sales x 1.5",
        "rankings": [
            {
                "id": str(r.id),
                "koc_id": str(r.koc_id),
                "pool": r.pool,
                "rank": r.rank,
                "score": float(r.score),
                "orders_count": r.orders_count,
                "gmv": float(r.gmv),
                "cvr": r.cvr,
                "dpp_sales": r.dpp_sales,
                "commission_amount": float(r.commission_amount),
                "tx_hash": r.tx_hash,
                "distributed_at": r.distributed_at,
            }
            for r in rankings
        ],
    }


@router.get("/my-rank")
async def my_rank(
    week: Optional[int] = Query(None, ge=1, le=53),
    year: Optional[int] = Query(None, ge=2024, le=2030),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current user's ranking position for the given week."""
    w, y = _current_iso_week()
    week = week or w
    year = year or y

    result = await db.execute(
        select(PoolRanking).where(
            PoolRanking.koc_id == current_user.id,
            PoolRanking.week == week,
            PoolRanking.year == year,
        )
    )
    ranking = result.scalar_one_or_none()

    if not ranking:
        return MyRankOut(week=week, year=year, ranked=False)

    return MyRankOut(
        week=week,
        year=year,
        pool=ranking.pool,
        rank=ranking.rank,
        score=float(ranking.score),
        orders_count=ranking.orders_count,
        gmv=float(ranking.gmv),
        cvr=ranking.cvr,
        dpp_sales=ranking.dpp_sales,
        commission_amount=float(ranking.commission_amount),
        tx_hash=ranking.tx_hash,
        ranked=True,
    )


@router.get("/distributions")
async def distribution_history(
    week: Optional[int] = Query(None, ge=1, le=53),
    year: Optional[int] = Query(None, ge=2024, le=2030),
    pagination: Pagination = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Distribution history — on-chain TX records."""
    query = select(PoolDistribution).order_by(PoolDistribution.created_at.desc())

    if week:
        query = query.where(PoolDistribution.week == week)
    if year:
        query = query.where(PoolDistribution.year == year)

    query = query.offset(pagination.offset).limit(pagination.per_page)
    result = await db.execute(query)
    distributions = result.scalars().all()

    return {
        "distributions": [
            {
                "id": str(d.id),
                "week": d.week,
                "year": d.year,
                "pool": d.pool,
                "total_amount": float(d.total_amount),
                "recipients_count": d.recipients_count,
                "tx_hash": d.tx_hash,
                "status": d.status,
                "distributed_at": d.distributed_at,
                "created_at": d.created_at,
            }
            for d in distributions
        ],
    }


@router.get("/{pool}/members")
async def pool_members(
    pool: str,
    week: Optional[int] = Query(None, ge=1, le=53),
    year: Optional[int] = Query(None, ge=2024, le=2030),
    pagination: Pagination = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """List members of a specific pool (A/B/C) for a given week."""
    pool = pool.upper()
    if pool not in ("A", "B", "C"):
        raise HTTPException(400, "Pool must be A, B, or C")

    w, y = _current_iso_week()
    week = week or w
    year = year or y

    query = (
        select(PoolRanking)
        .where(
            PoolRanking.pool == pool,
            PoolRanking.week == week,
            PoolRanking.year == year,
        )
        .order_by(PoolRanking.rank.asc())
        .offset(pagination.offset)
        .limit(pagination.per_page)
    )
    result = await db.execute(query)
    members = result.scalars().all()

    total_q = await db.execute(
        select(func.count(PoolRanking.id)).where(
            PoolRanking.pool == pool,
            PoolRanking.week == week,
            PoolRanking.year == year,
        )
    )
    total = total_q.scalar() or 0

    return {
        "pool": pool,
        "week": week,
        "year": year,
        "total_members": total,
        "pool_info": POOL_CONFIG_DEFAULTS.get(PoolTier(pool), {}),
        "members": [
            {
                "koc_id": str(m.koc_id),
                "rank": m.rank,
                "score": float(m.score),
                "orders_count": m.orders_count,
                "gmv": float(m.gmv),
                "cvr": m.cvr,
                "dpp_sales": m.dpp_sales,
                "commission_amount": float(m.commission_amount),
                "tx_hash": m.tx_hash,
                "distributed_at": m.distributed_at,
            }
            for m in members
        ],
    }


@router.post("/snapshot")
async def trigger_snapshot(
    body: SnapshotRequest = SnapshotRequest(),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin triggers weekly ranking snapshot (normally cron Monday 00:00).
    Calculates scores for all KOCs based on their weekly performance,
    ranks them, and assigns pool tiers.
    """
    w, y = _current_iso_week()
    week = body.week or w
    year = body.year or y

    # Check if snapshot already exists for this week
    existing = await db.execute(
        select(func.count(PoolRanking.id)).where(
            PoolRanking.week == week,
            PoolRanking.year == year,
        )
    )
    existing_count = existing.scalar() or 0
    if existing_count > 0:
        raise HTTPException(
            409,
            f"Snapshot already exists for week {week}/{year} with {existing_count} entries. "
            "Delete existing snapshot first to regenerate."
        )

    # Aggregate KOC performance for the week from orders/commissions
    # This uses the Commission and Order models to compute weekly metrics
    from app.models.order import Order, Commission

    period_label = f"{year}-W{week:02d}"

    # Get all KOCs with their weekly performance
    koc_stats_q = (
        select(
            Commission.koc_id,
            func.count(Commission.id).label("orders_count"),
            func.coalesce(func.sum(Commission.order_amount), 0).label("gmv"),
        )
        .join(Order, Commission.order_id == Order.id)
        .where(
            func.extract("isoyear", Order.created_at) == year,
            func.extract("week", Order.created_at) == week,
            Order.status.in_(["completed", "delivered"]),
        )
        .group_by(Commission.koc_id)
    )
    koc_stats_r = await db.execute(koc_stats_q)
    koc_stats = koc_stats_r.all()

    if not koc_stats:
        return {"message": f"No KOC data found for week {week}/{year}", "entries_created": 0}

    # Build scored list
    scored = []
    for row in koc_stats:
        koc_id = row.koc_id
        orders_count = row.orders_count or 0
        gmv = float(row.gmv or 0)
        # CVR approximation: orders / (orders + some baseline)
        cvr = min(1.0, orders_count / max(orders_count + 10, 1))
        dpp_sales = 0  # Will be enriched from DPP data if available

        score = _compute_score(orders_count, gmv, cvr, dpp_sales)
        scored.append({
            "koc_id": koc_id,
            "orders_count": orders_count,
            "gmv": gmv,
            "cvr": round(cvr, 4),
            "dpp_sales": dpp_sales,
            "score": round(score, 4),
        })

    # Sort by score descending and assign ranks
    scored.sort(key=lambda x: x["score"], reverse=True)

    entries_created = 0
    for idx, item in enumerate(scored, start=1):
        pool_tier = _assign_pool(idx)
        if pool_tier is None:
            continue  # Outside top 200

        ranking = PoolRanking(
            koc_id=item["koc_id"],
            week=week,
            year=year,
            pool=pool_tier,
            rank=idx,
            score=item["score"],
            orders_count=item["orders_count"],
            gmv=item["gmv"],
            cvr=item["cvr"],
            dpp_sales=item["dpp_sales"],
        )
        db.add(ranking)
        entries_created += 1

    await db.flush()

    return {
        "message": f"Snapshot created for week {week}/{year}",
        "entries_created": entries_created,
        "pool_breakdown": {
            "A": sum(1 for s in scored[:10] if _assign_pool(scored.index(s) + 1) == "A"),
            "B": sum(1 for i, s in enumerate(scored, 1) if _assign_pool(i) == "B"),
            "C": sum(1 for i, s in enumerate(scored, 1) if _assign_pool(i) == "C"),
        },
    }


@router.post("/distribute")
async def trigger_distribution(
    body: DistributeRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin triggers on-chain distribution for a specific week.
    Distributes total_pool_amount across Pool A (40%), B (35%), C (25%).
    """
    pools_to_distribute = (
        [body.pool.upper()] if body.pool and body.pool.upper() in ("A", "B", "C")
        else ["A", "B", "C"]
    )

    results = []
    for pool_tier in pools_to_distribute:
        cfg = POOL_CONFIG_DEFAULTS[PoolTier(pool_tier)]
        pool_amount = body.total_pool_amount * (cfg["percentage"] / 100.0)

        # Get rankings for this pool/week
        rankings_r = await db.execute(
            select(PoolRanking).where(
                PoolRanking.pool == pool_tier,
                PoolRanking.week == body.week,
                PoolRanking.year == body.year,
                PoolRanking.distributed_at.is_(None),
            ).order_by(PoolRanking.rank.asc())
        )
        rankings = rankings_r.scalars().all()

        if not rankings:
            results.append({
                "pool": pool_tier,
                "status": "skipped",
                "reason": "No undistributed rankings found",
            })
            continue

        # Distribute proportionally by score within the pool
        total_score = sum(float(r.score) for r in rankings)
        if total_score == 0:
            total_score = 1  # Avoid division by zero; equal split

        now = datetime.now(timezone.utc)
        tx_hash = f"0x{uuid.uuid4().hex}"  # Placeholder — real on-chain TX in production

        for r in rankings:
            share = (float(r.score) / total_score) * pool_amount
            r.commission_amount = round(share, 2)
            r.tx_hash = tx_hash
            r.distributed_at = now

        # Log distribution
        dist = PoolDistribution(
            week=body.week,
            year=body.year,
            pool=pool_tier,
            total_amount=round(pool_amount, 2),
            recipients_count=len(rankings),
            tx_hash=tx_hash,
            status="completed",
            distributed_at=now,
            dist_metadata={
                "total_pool_amount": body.total_pool_amount,
                "pool_percentage": cfg["percentage"],
                "triggered_by": str(current_user.id),
            },
        )
        db.add(dist)

        results.append({
            "pool": pool_tier,
            "status": "completed",
            "amount_distributed": round(pool_amount, 2),
            "recipients": len(rankings),
            "tx_hash": tx_hash,
        })

    await db.flush()

    return {
        "week": body.week,
        "year": body.year,
        "total_pool_amount": body.total_pool_amount,
        "distributions": results,
    }
