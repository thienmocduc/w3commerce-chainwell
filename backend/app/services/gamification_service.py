"""
WellKOC — Gamification Service
WK Engine · Tier Upgrades · Achievement Unlocks · Daily Check-in · Mission Tracking
"""
import logging
from datetime import datetime, date, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import (
    UserWK, WKTransaction, Achievement, UserAchievement,
    Mission, UserMission, DailyCheckin, LeaderboardEntry,
    WKEvent, WK_AMOUNTS, KOCTier, KOC_TIER_XP, ACHIEVEMENTS_CATALOG,
    MissionStatus,
)
from app.models.user import User

logger = logging.getLogger(__name__)


class GamificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══ WK ENGINE ═══════════════════════════════════════════

    async def award_wk(
        self,
        user_id: UUID,
        event: WKEvent,
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        custom_amount: Optional[int] = None,
    ) -> dict:
        """
        Central WK award function. Called from order service, content service, etc.
        Returns: {wk_earned, new_total, tier_changed, new_tier}
        """
        # Get or create UserWK record
        result = await self.db.execute(select(UserWK).where(UserWK.user_id == user_id))
        user_wk = result.scalar_one_or_none()
        if not user_wk:
            user_wk = UserWK(user_id=user_id)
            self.db.add(user_wk)
            await self.db.flush()

        base_xp = custom_amount or WK_AMOUNTS.get(event, 0)
        if base_xp == 0:
            return {"wk_earned": 0}

        # Apply streak bonus for check-ins
        if event == WKEvent.STREAK_BONUS:
            base_xp = 5 * user_wk.current_streak  # 5 × streak_days

        # Apply multiplier
        effective_multiplier = user_wk.wk_multiplier
        if user_wk.multiplier_expires_at and user_wk.multiplier_expires_at < datetime.now(timezone.utc):
            user_wk.wk_multiplier = 1.0  # Reset expired multiplier
            effective_multiplier = 1.0

        wk_earned = int(base_xp * effective_multiplier)
        old_tier = user_wk.tier

        # Update totals
        user_wk.total_wk += wk_earned
        user_wk.season_wk += wk_earned
        user_wk.weekly_wk += wk_earned
        new_tier = user_wk.tier

        # Update tier field
        if new_tier != old_tier:
            user_wk.current_tier = new_tier
            logger.info(f"🎉 User {user_id} tier upgrade: {old_tier} → {new_tier}")

        self.db.add(user_wk)

        # Write transaction log
        tx = WKTransaction(
            user_id=user_id,
            event_type=event,
            wk_earned=wk_earned,
            multiplier_applied=effective_multiplier,
            total_after=user_wk.total_wk,
            reference_id=reference_id,
            tx_metadata=metadata,
        )
        self.db.add(tx)
        await self.db.flush()

        # Check achievement triggers
        await self._check_xp_achievements(user_id, user_wk.total_wk)

        # Update mission progress
        await self._update_mission_progress(user_id, event)

        result = {
            "wk_earned": wk_earned,
            "new_total": user_wk.total_wk,
            "tier_changed": new_tier != old_tier,
            "new_tier": new_tier,
            "old_tier": old_tier if new_tier != old_tier else None,
            "progress_to_next": user_wk.progress_to_next,
        }
        logger.info(f"WK awarded: {user_id} +{wk_earned} ({event}) → {user_wk.total_wk} total")
        return result

    # ══ DAILY CHECK-IN ══════════════════════════════════════

    async def daily_checkin(self, user_id: UUID) -> dict:
        """
        Process daily check-in. Max 1 per UTC day.
        Streak logic: consecutive days = escalating rewards.
        """
        today = date.today()

        # Check already checked in today
        existing = await self.db.execute(
            select(DailyCheckin).where(
                DailyCheckin.user_id == user_id,
                DailyCheckin.checkin_date == today,
            )
        )
        if existing.scalar_one_or_none():
            return {"already_checked_in": True, "date": str(today)}

        # Get UserWK for streak tracking
        r = await self.db.execute(select(UserWK).where(UserWK.user_id == user_id))
        user_wk = r.scalar_one_or_none()
        if not user_wk:
            user_wk = UserWK(user_id=user_id)
            self.db.add(user_wk)
            await self.db.flush()

        # Calculate streak
        yesterday = today - timedelta(days=1)
        if user_wk.last_checkin_date == yesterday:
            user_wk.current_streak += 1
        else:
            user_wk.current_streak = 1  # Reset

        user_wk.longest_streak = max(user_wk.longest_streak, user_wk.current_streak)
        user_wk.last_checkin_date = today
        self.db.add(user_wk)

        # Base WK + streak bonus
        base_xp = WK_AMOUNTS[WKEvent.DAILY_CHECKIN]  # 5 WK
        streak_bonus = user_wk.current_streak * 2     # 2 WK per streak day
        streak_milestone_bonus = 0
        bonus_reason = None

        # Streak milestone bonuses
        STREAK_MILESTONES = {7: 50, 14: 100, 30: 300, 60: 500, 100: 1000}
        if user_wk.current_streak in STREAK_MILESTONES:
            streak_milestone_bonus = STREAK_MILESTONES[user_wk.current_streak]
            bonus_reason = f"streak_{user_wk.current_streak}"

        total_wk = base_xp + streak_bonus + streak_milestone_bonus

        # WK token reward (small daily bonus)
        wk_reward = 0.5 + (user_wk.current_streak * 0.1)  # 0.5 + 0.1 per streak day

        # Save check-in record
        checkin = DailyCheckin(
            user_id=user_id,
            checkin_date=today,
            streak_day=user_wk.current_streak,
            wk_earned=wk_reward,
            bonus_reason=bonus_reason,
        )
        self.db.add(checkin)

        # Award WK
        await self.award_wk(user_id, WKEvent.DAILY_CHECKIN, custom_amount=total_wk)

        # Check streak achievements
        await self._check_streak_achievements(user_id, user_wk.current_streak)

        # Real-time notify (WebSocket)
        from app.api.v1.endpoints.websocket import notify_user
        await notify_user(str(user_id), "daily_checkin", {
            "xp_earned": total_wk,
            "wk_earned": float(wk_reward),
            "streak": user_wk.current_streak,
            "bonus": streak_milestone_bonus > 0,
        })

        return {
            "xp_earned": total_wk,
            "wk_earned": float(wk_reward),
            "streak": user_wk.current_streak,
            "longest_streak": user_wk.longest_streak,
            "streak_milestone": streak_milestone_bonus > 0,
            "milestone_bonus": streak_milestone_bonus,
        }

    # ══ ACHIEVEMENTS ════════════════════════════════════════

    async def unlock_achievement(self, user_id: UUID, achievement_id: str) -> Optional[dict]:
        """
        Unlock an achievement for a user if not already unlocked.
        Returns the achievement data or None if already owned.
        """
        # Check already unlocked
        existing = await self.db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id,
            )
        )
        if existing.scalar_one_or_none():
            return None

        # Get achievement definition
        ach_data = next((a for a in ACHIEVEMENTS_CATALOG if a["id"] == achievement_id), None)
        if not ach_data:
            return None

        # Grant achievement
        ua = UserAchievement(user_id=user_id, achievement_id=achievement_id)
        self.db.add(ua)
        await self.db.flush()

        # Award WK
        if ach_data.get("wk_reward", 0) > 0:
            await self.award_wk(
                user_id, WKEvent.ACHIEVEMENT_UNLOCKED,
                reference_id=achievement_id,
                custom_amount=ach_data["wk_reward"]
            )

        # Real-time notification
        from app.api.v1.endpoints.websocket import notify_user
        await notify_user(str(user_id), "achievement_unlocked", {
            "id": achievement_id,
            "name": ach_data["name"],
            "name_en": ach_data["name_en"],
            "icon": ach_data["icon"],
            "wk_reward": ach_data["wk_reward"],
            "is_rare": ach_data.get("is_rare", False),
        })

        logger.info(f"🏆 Achievement unlocked: {user_id} → {achievement_id}")
        return ach_data

    async def get_user_achievements(self, user_id: UUID) -> dict:
        """Get user's earned achievements and progress toward unearned ones"""
        r = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
            .order_by(UserAchievement.earned_at.desc())
        )
        earned = r.scalars().all()
        earned_ids = {ua.achievement_id for ua in earned}

        # Group achievements by category
        result = {"earned": [], "in_progress": [], "locked": []}
        for ach in ACHIEVEMENTS_CATALOG:
            if ach["id"] in earned_ids:
                ua = next(ua for ua in earned if ua.achievement_id == ach["id"])
                result["earned"].append({
                    **ach,
                    "earned_at": ua.earned_at.isoformat(),
                    "is_pinned": ua.is_pinned,
                    "nft_tx_hash": ua.nft_tx_hash,
                })
            else:
                result["locked"].append(ach)

        return result

    # ══ LEADERBOARD ═════════════════════════════════════════

    async def get_leaderboard(
        self,
        board_type: str = "koc_weekly_gmv",
        period: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        """Get leaderboard entries for a given period"""
        if not period:
            from datetime import date
            d = date.today()
            period = f"{d.year}-W{d.isocalendar().week:02d}"

        r = await self.db.execute(
            select(LeaderboardEntry, User.display_name, User.avatar_url)
            .join(User, LeaderboardEntry.user_id == User.id)
            .where(
                LeaderboardEntry.board_type == board_type,
                LeaderboardEntry.period == period,
            )
            .order_by(LeaderboardEntry.rank)
            .limit(limit)
        )
        rows = r.all()
        return [
            {
                "rank": row.LeaderboardEntry.rank,
                "user_id": str(row.LeaderboardEntry.user_id),
                "display_name": row.display_name,
                "avatar_url": row.avatar_url,
                "score": float(row.LeaderboardEntry.score),
                "pool_tier": row.LeaderboardEntry.pool_tier,
                "commission_pool_amount": float(row.LeaderboardEntry.commission_pool_amount),
            }
            for row in rows
        ]

    async def get_user_xp_profile(self, user_id: UUID) -> dict:
        """Full WK profile for dashboard display"""
        r = await self.db.execute(select(UserWK).where(UserWK.user_id == user_id))
        xp = r.scalar_one_or_none()
        if not xp:
            xp = UserWK(user_id=user_id)
            self.db.add(xp)
            await self.db.flush()

        # Count achievements
        ach_count = await self.db.execute(
            select(func.count(UserAchievement.id)).where(UserAchievement.user_id == user_id)
        )

        # Recent WK transactions
        recent_r = await self.db.execute(
            select(WKTransaction).where(WKTransaction.user_id == user_id)
            .order_by(WKTransaction.created_at.desc())
            .limit(10)
        )
        recent_txs = recent_r.scalars().all()

        return {
            "total_wk": xp.total_wk,
            "season_wk": xp.season_wk,
            "weekly_wk": xp.weekly_wk,
            "current_tier": xp.current_tier,
            "tier_perks": KOC_TIER_XP,
            "progress_to_next": xp.progress_to_next,
            "next_tier_xp": xp.next_tier_xp,
            "wk_needed": (xp.next_tier_xp - xp.total_wk) if xp.next_tier_xp else 0,
            "current_streak": xp.current_streak,
            "longest_streak": xp.longest_streak,
            "last_checkin": str(xp.last_checkin_date) if xp.last_checkin_date else None,
            "can_checkin_today": xp.last_checkin_date != date.today(),
            "achievement_count": ach_count.scalar() or 0,
            "wk_multiplier": float(xp.wk_multiplier),
            "recent_activity": [
                {
                    "event": tx.event_type,
                    "wk": tx.wk_earned,
                    "at": tx.created_at.isoformat(),
                }
                for tx in recent_txs
            ],
        }

    # ══ PRIVATE HELPERS ═════════════════════════════════════

    async def _check_xp_achievements(self, user_id: UUID, total_wk: int) -> None:
        """Check and unlock WK milestone achievements"""
        # Tier achievements (trigger on tier change, handled elsewhere)
        pass

    async def _check_streak_achievements(self, user_id: UUID, streak: int) -> None:
        """Check streak-based achievements"""
        STREAK_ACHIEVEMENTS = {7: "streak_7", 30: "streak_30", 100: "streak_100"}
        if streak in STREAK_ACHIEVEMENTS:
            await self.unlock_achievement(user_id, STREAK_ACHIEVEMENTS[streak])

    async def _update_mission_progress(self, user_id: UUID, event: WKEvent) -> None:
        """Update mission progress when an WK event occurs"""
        from datetime import date
        today = date.today()
        period_daily  = str(today)
        period_weekly = f"{today.year}-W{today.isocalendar().week:02d}"

        # Find active missions that target this event
        r = await self.db.execute(
            select(Mission).where(
                Mission.target_event == event,
                Mission.is_active == True,
            )
        )
        missions = r.scalars().all()

        for mission in missions:
            period = period_daily if mission.type == "daily" else period_weekly

            # Get or create user mission progress
            um_r = await self.db.execute(
                select(UserMission).where(
                    UserMission.user_id == user_id,
                    UserMission.mission_id == mission.id,
                    UserMission.period == period,
                )
            )
            um = um_r.scalar_one_or_none()
            if not um:
                um = UserMission(
                    user_id=user_id,
                    mission_id=mission.id,
                    period=period,
                    progress=0,
                )
                self.db.add(um)

            if um.status != MissionStatus.ACTIVE:
                continue

            um.progress += 1
            if um.progress >= mission.target_count:
                um.status = MissionStatus.COMPLETED
                um.completed_at = datetime.now(timezone.utc)
                # Auto-award WK for mission completion
                await self.award_wk(
                    user_id, WKEvent.MISSION_COMPLETED,
                    reference_id=mission.id,
                    custom_amount=mission.wk_reward,
                )
            self.db.add(um)
