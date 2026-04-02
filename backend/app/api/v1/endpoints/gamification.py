"""
WellKOC — Gamification Endpoints
GET  /gamification/me              My WK profile + tier + streak
POST /gamification/checkin         Daily check-in
GET  /gamification/achievements    My achievements gallery
GET  /gamification/missions        Active missions + progress
POST /gamification/missions/:id/claim  Claim mission reward
GET  /gamification/leaderboard     Live leaderboard
GET  /gamification/catalog         All achievements catalog
GET  /gamification/koc-tiers       Tier perks info
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, CurrentUser
from app.models.gamification import (
    ACHIEVEMENTS_CATALOG, KOC_TIER_XP, KOC_TIER_PERKS,
    MissionStatus, Mission, UserMission,
)
from app.services.gamification_service import GamificationService

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/me")
async def my_wk_profile(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Full WK profile: tier, streak, recent activity, progress to next tier"""
    svc = GamificationService(db)
    return await svc.get_user_xp_profile(current_user.id)


@router.post("/checkin")
async def daily_checkin(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Daily check-in. Max 1 per UTC day.
    Rewards: 5 WK base + (2 × streak_days) + milestone bonuses + WK tokens.
    """
    svc = GamificationService(db)
    result = await svc.daily_checkin(current_user.id)
    if result.get("already_checked_in"):
        raise HTTPException(400, "Bạn đã check-in hôm nay rồi!")
    return result


@router.get("/achievements")
async def my_achievements(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get all earned achievements + locked ones (with progress hints)"""
    svc = GamificationService(db)
    return await svc.get_user_achievements(current_user.id)


@router.get("/achievements/catalog")
async def achievements_catalog(
    category: Optional[str] = Query(None),
):
    """Full achievement catalog (public) — for displaying to prospective users"""
    catalog = ACHIEVEMENTS_CATALOG
    if category:
        catalog = [a for a in catalog if a["category"] == category]
    return {
        "total": len(catalog),
        "categories": list({a["category"] for a in ACHIEVEMENTS_CATALOG}),
        "achievements": catalog,
    }


@router.get("/missions")
async def my_missions(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Active missions with current progress"""
    from datetime import date
    from sqlalchemy import select, or_

    today = date.today()
    period_daily  = str(today)
    period_weekly = f"{today.year}-W{today.isocalendar().week:02d}"

    # Get active missions for user's role
    missions_r = await db.execute(
        select(Mission).where(Mission.is_active == True)
    )
    missions = missions_r.scalars().all()

    result = []
    for m in missions:
        period = period_daily if m.type == "daily" else period_weekly

        # Get progress
        um_r = await db.execute(
            select(UserMission).where(
                UserMission.user_id == current_user.id,
                UserMission.mission_id == m.id,
                UserMission.period == period,
            )
        )
        um = um_r.scalar_one_or_none()

        progress = um.progress if um else 0
        status = um.status if um else MissionStatus.ACTIVE

        result.append({
            "id": m.id,
            "type": m.type,
            "name": m.name,
            "name_en": m.name_en,
            "description": m.description,
            "icon": m.icon,
            "target_count": m.target_count,
            "progress": progress,
            "progress_pct": min(100, int(progress / m.target_count * 100)),
            "status": status,
            "wk_reward": float(m.wk_reward),
            "can_claim": status == MissionStatus.COMPLETED,
            "period": period,
        })

    # Sort: claimable first, then in-progress, then active
    result.sort(key=lambda x: (
        0 if x["status"] == "completed" else
        1 if x["progress"] > 0 else 2
    ))
    return {"missions": result, "period_daily": period_daily, "period_weekly": period_weekly}


@router.post("/missions/{mission_id}/claim")
async def claim_mission_reward(
    mission_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Claim completed mission reward"""
    from datetime import date
    from sqlalchemy import select, update
    from datetime import datetime, timezone

    today = date.today()
    period = str(today)

    um_r = await db.execute(
        select(UserMission).where(
            UserMission.user_id == current_user.id,
            UserMission.mission_id == mission_id,
            UserMission.period == period,
            UserMission.status == MissionStatus.COMPLETED,
        )
    )
    um = um_r.scalar_one_or_none()
    if not um:
        raise HTTPException(400, "Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng")

    m_r = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = m_r.scalar_one_or_none()
    if not mission:
        raise HTTPException(404, "Nhiệm vụ không tồn tại")

    um.status = MissionStatus.CLAIMED
    um.claimed_at = datetime.now(timezone.utc)
    db.add(um)

    svc = GamificationService(db)
    await svc.award_wk(
        current_user.id,
        "mission_completed",
        reference_id=mission_id,
        custom_amount=mission.wk_reward,
    )

    return {
        "claimed": True,
        "mission_name": mission.name,
        "wk_reward": float(mission.wk_reward),
    }


@router.get("/leaderboard")
async def leaderboard(
    board_type: str = Query("koc_weekly_gmv", enum=["koc_weekly_gmv", "koc_weekly_orders", "vendor_revenue", "buyer_xp"]),
    period: Optional[str] = Query(None, description="Format: 2026-W12"),
    limit: int = Query(100, ge=10, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Live leaderboard — Pool A/B/C ranking visible to all"""
    svc = GamificationService(db)
    entries = await svc.get_leaderboard(board_type=board_type, period=period, limit=limit)

    # Add pool tier annotation
    for e in entries:
        r = e["rank"]
        e["pool_tier"] = "A" if r <= max(1, limit // 20) else "B" if r <= max(1, limit // 5) else "C" if r <= limit // 2 else None

    return {
        "board_type": board_type,
        "period": period,
        "entries": entries,
        "pool_cutoffs": {
            "pool_a": "Top 5%",
            "pool_b": "Top 6-20%",
            "pool_c": "Top 21-50%",
        },
    }


@router.get("/tiers")
async def koc_tiers():
    """KOC Tier system information — public"""
    return {
        "tiers": [
            {
                "tier": tier,
                "min_xp": min_xp,
                "perks": KOC_TIER_PERKS[tier],
                "label_vi": {
                    "bronze": "Đồng",
                    "silver": "Bạc",
                    "gold": "Vàng",
                    "diamond": "Kim Cương",
                    "legend": "Huyền Thoại",
                }[tier],
            }
            for tier, min_xp in KOC_TIER_XP.items()
        ]
    }
