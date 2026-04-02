"""
WellKOC — Gamification Models
WK System · KOC Tiers · Achievements · Daily Streaks · Missions · Leaderboard · Badges NFT
"""
import uuid
from datetime import datetime, date
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, Numeric,
    String, Text, func, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


# ══ KOC TIER SYSTEM ══════════════════════════════════════════
class KOCTier(str, Enum):
    BRONZE   = "bronze"    # 0–999 WK
    SILVER   = "silver"    # 1K–4,999 WK
    GOLD     = "gold"      # 5K–19,999 WK
    DIAMOND  = "diamond"   # 20K–49,999 WK
    LEGEND   = "legend"    # 50K+ WK (top 1%)

KOC_TIER_XP = {
    KOCTier.BRONZE:  0,
    KOCTier.SILVER:  1_000,
    KOCTier.GOLD:    5_000,
    KOCTier.DIAMOND: 20_000,
    KOCTier.LEGEND:  50_000,
}

KOC_TIER_PERKS = {
    KOCTier.BRONZE:  {"commission_bonus": 0.00,  "pool_eligible": False, "ai_credits": 50,   "badge_color": "#CD7F32"},
    KOCTier.SILVER:  {"commission_bonus": 0.01,  "pool_eligible": False, "ai_credits": 200,  "badge_color": "#C0C0C0"},
    KOCTier.GOLD:    {"commission_bonus": 0.02,  "pool_eligible": True,  "ai_credits": 500,  "badge_color": "#FFD700"},
    KOCTier.DIAMOND: {"commission_bonus": 0.035, "pool_eligible": True,  "ai_credits": 2000, "badge_color": "#B9F2FF"},
    KOCTier.LEGEND:  {"commission_bonus": 0.05,  "pool_eligible": True,  "ai_credits": -1,   "badge_color": "#FF69B4"},  # -1 = unlimited
}


# ══ WK EVENTS — how WK is earned ════════════════════════════
class WKEvent(str, Enum):
    ORDER_COMPLETED       = "order_completed"       # +50 WK per order (buyer)
    ORDER_REFERRED        = "order_referred"         # +100 WK per T1 order (KOC)
    ORDER_T2_REFERRED     = "order_t2_referred"      # +30 WK per T2 (KOC)
    PRODUCT_REVIEWED      = "product_reviewed"       # +20 WK (buyer)
    DPP_VERIFIED_PURCHASE = "dpp_verified"           # +15 WK (buyer)
    GROUP_BUY_JOINED      = "group_buy_joined"       # +10 WK (buyer)
    GROUP_BUY_STARTED     = "group_buy_started"      # +50 WK (KOC/vendor)
    DAILY_CHECKIN         = "daily_checkin"          # +5 WK base
    STREAK_BONUS          = "streak_bonus"           # +5×N WK (N = streak days)
    CONTENT_POSTED        = "content_posted"         # +10 WK
    LIVE_HOSTED           = "live_hosted"            # +100 WK
    LIVE_1K_VIEWERS       = "live_1k_viewers"        # +200 WK bonus
    MISSION_COMPLETED     = "mission_completed"      # varies
    ACHIEVEMENT_UNLOCKED  = "achievement_unlocked"   # varies
    KOC_REFERRED          = "koc_referred"           # +500 WK (T2 chain)
    FOLLOWER_MILESTONE    = "follower_milestone"     # 1K/5K/10K/50K/100K
    GMV_MILESTONE         = "gmv_milestone"          # 1M/10M/100M VND
    VENDOR_FIRST_DPP      = "vendor_first_dpp"       # +200 WK
    VENDOR_SALES_MILESTONE = "vendor_sales_milestone" # varies

WK_AMOUNTS = {
    WKEvent.ORDER_COMPLETED: 50,
    WKEvent.ORDER_REFERRED: 100,
    WKEvent.ORDER_T2_REFERRED: 30,
    WKEvent.PRODUCT_REVIEWED: 20,
    WKEvent.DPP_VERIFIED_PURCHASE: 15,
    WKEvent.GROUP_BUY_JOINED: 10,
    WKEvent.GROUP_BUY_STARTED: 50,
    WKEvent.DAILY_CHECKIN: 5,
    WKEvent.CONTENT_POSTED: 10,
    WKEvent.LIVE_HOSTED: 100,
    WKEvent.LIVE_1K_VIEWERS: 200,
    WKEvent.KOC_REFERRED: 500,
    WKEvent.VENDOR_FIRST_DPP: 200,
}


# ══ MODELS ═══════════════════════════════════════════════════

class UserWK(Base):
    """Central WK ledger for all users"""
    __tablename__ = "user_wk"
    __table_args__ = (
        Index("ix_user_xp_user_id", "user_id"),
        Index("ix_user_xp_total", "total_wk"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)

    total_wk: Mapped[int] = mapped_column(Integer, default=0)
    current_tier: Mapped[str] = mapped_column(String(20), default=KOCTier.BRONZE)
    season_wk: Mapped[int] = mapped_column(Integer, default=0)   # resets quarterly
    weekly_wk: Mapped[int] = mapped_column(Integer, default=0)   # resets Monday

    # Streak
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_checkin_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Multipliers (events, special periods)
    wk_multiplier: Mapped[float] = mapped_column(Numeric(3, 2), default=1.0)
    multiplier_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def tier(self) -> KOCTier:
        for tier in reversed(list(KOCTier)):
            if self.total_wk >= KOC_TIER_XP[tier]:
                return tier
        return KOCTier.BRONZE

    @property
    def next_tier_xp(self) -> Optional[int]:
        tiers = list(KOCTier)
        idx = tiers.index(self.tier)
        if idx < len(tiers) - 1:
            return KOC_TIER_XP[tiers[idx + 1]]
        return None

    @property
    def progress_to_next(self) -> float:
        current_min = KOC_TIER_XP[self.tier]
        next_min = self.next_tier_xp
        if next_min is None:
            return 1.0
        return min(1.0, (self.total_wk - current_min) / (next_min - current_min))


class WKTransaction(Base):
    """Audit log of every WK gain/loss"""
    __tablename__ = "wk_transactions"
    __table_args__ = (
        Index("ix_xp_tx_user", "user_id"),
        Index("ix_xp_tx_event", "event_type"),
        Index("ix_xp_tx_created", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(50))
    wk_earned: Mapped[int] = mapped_column(Integer)  # can be negative (penalty)
    multiplier_applied: Mapped[float] = mapped_column(Numeric(3, 2), default=1.0)
    total_after: Mapped[int] = mapped_column(Integer)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # order_id, etc.
    tx_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ══ ACHIEVEMENTS ════════════════════════════════════════════

class AchievementCategory(str, Enum):
    SALES      = "sales"       # Revenue milestones
    SOCIAL     = "social"      # Followers, follows
    CONTENT    = "content"     # Posts, lives
    LOYALTY    = "loyalty"     # Streaks, check-ins
    WEB3       = "web3"        # DPP, NFT, on-chain
    SPECIAL    = "special"     # Limited time events
    VENDOR     = "vendor"      # Vendor-specific


ACHIEVEMENTS_CATALOG = [
    # ── Sales achievements ──
    {"id": "first_sale",      "name": "Đơn Đầu Tiên",       "name_en": "First Sale",        "category": "sales",   "wk_reward": 200,  "icon": "🎯", "description": "Hoàn thành đơn hàng T1 đầu tiên"},
    {"id": "sales_1m",        "name": "Triệu Phú KOC",      "name_en": "KOC Millionaire",   "category": "sales",   "wk_reward": 1000, "icon": "💰", "description": "GMV cộng dồn đạt ₫1,000,000"},
    {"id": "sales_10m",       "name": "KOC Tinh Anh",       "name_en": "Elite KOC",         "category": "sales",   "wk_reward": 3000, "icon": "💎", "description": "GMV cộng dồn đạt ₫10,000,000"},
    {"id": "sales_100m",      "name": "Huyền Thoại KOC",    "name_en": "KOC Legend",        "category": "sales",   "wk_reward": 10000,"icon": "👑", "description": "GMV cộng dồn đạt ₫100,000,000"},
    {"id": "sales_streak_7",  "name": "7 Ngày Không Nghỉ",  "name_en": "7-Day Hustle",      "category": "sales",   "wk_reward": 500,  "icon": "🔥", "description": "Có đơn T1 trong 7 ngày liên tiếp"},
    {"id": "pool_a_first",    "name": "Top 5% Pool A",       "name_en": "Pool A Champion",   "category": "sales",   "wk_reward": 2000, "icon": "🏆", "description": "Lọt Pool A lần đầu tiên"},

    # ── Social achievements ──
    {"id": "followers_1k",    "name": "1K Followers",        "name_en": "1K Followers",      "category": "social",  "wk_reward": 300,  "icon": "⭐", "description": "Đạt 1,000 followers"},
    {"id": "followers_10k",   "name": "10K KOC",             "name_en": "10K KOC",           "category": "social",  "wk_reward": 1000, "icon": "🌟", "description": "Đạt 10,000 followers"},
    {"id": "followers_100k",  "name": "KOC 100K",            "name_en": "100K KOC",          "category": "social",  "wk_reward": 5000, "icon": "💫", "description": "Đạt 100,000 followers"},
    {"id": "koc_referred_5",  "name": "Người Dẫn Đường",    "name_en": "Path Finder",       "category": "social",  "wk_reward": 800,  "icon": "🗺️", "description": "Giới thiệu 5 KOC vào hệ thống"},
    {"id": "koc_referred_50", "name": "Đại Sứ WellKOC",     "name_en": "WellKOC Ambassador","category": "social",  "wk_reward": 5000, "icon": "🎖️", "description": "Giới thiệu 50 KOC vào hệ thống"},

    # ── Content achievements ──
    {"id": "first_live",      "name": "KOC Live Đầu Tiên",  "name_en": "First Live",        "category": "content", "wk_reward": 300,  "icon": "🎥", "description": "Tổ chức buổi live đầu tiên"},
    {"id": "live_1k_viewers", "name": "Nghìn Người Xem",    "name_en": "1K Viewers",        "category": "content", "wk_reward": 1000, "icon": "📺", "description": "Đạt 1,000 viewers trong 1 buổi live"},
    {"id": "posts_100",       "name": "100 Bài Đăng",       "name_en": "100 Posts",         "category": "content", "wk_reward": 500,  "icon": "✍️", "description": "Đăng 100 bài nội dung"},
    {"id": "viral_post",      "name": "Bài Viral",           "name_en": "Viral Post",        "category": "content", "wk_reward": 2000, "icon": "🚀", "description": "1 bài đạt >10,000 lượt tương tác"},

    # ── Loyalty achievements ──
    {"id": "streak_7",        "name": "Tuần Không Nghỉ",    "name_en": "Weekly Warrior",    "category": "loyalty", "wk_reward": 100,  "icon": "📅", "description": "Check-in 7 ngày liên tiếp"},
    {"id": "streak_30",       "name": "Tháng Không Nghỉ",   "name_en": "Monthly Master",    "category": "loyalty", "wk_reward": 500,  "icon": "📆", "description": "Check-in 30 ngày liên tiếp"},
    {"id": "streak_100",      "name": "100 Ngày",            "name_en": "Century Streak",    "category": "loyalty", "wk_reward": 2000, "icon": "💯", "description": "Check-in 100 ngày liên tiếp"},
    {"id": "first_anniversary","name": "1 Năm WellKOC",     "name_en": "1 Year Veteran",    "category": "loyalty", "wk_reward": 3000, "icon": "🎂", "description": "1 năm trong hệ sinh thái WellKOC"},

    # ── Web3 achievements ──
    {"id": "first_dpp_scan",  "name": "Người Xác Minh",     "name_en": "DPP Pioneer",       "category": "web3",    "wk_reward": 150,  "icon": "⬡",  "description": "Scan DPP QR đầu tiên"},
    {"id": "dpp_10_scans",    "name": "Thám Tử DPP",        "name_en": "DPP Detective",     "category": "web3",    "wk_reward": 300,  "icon": "🔍", "description": "Scan DPP 10 sản phẩm"},
    {"id": "wallet_connected","name": "Người Dùng Web3",    "name_en": "Web3 Native",       "category": "web3",    "wk_reward": 200,  "icon": "🦊", "description": "Kết nối ví MetaMask"},
    {"id": "first_onchain_tx","name": "On-Chain KOC",       "name_en": "On-Chain KOC",      "category": "web3",    "wk_reward": 500,  "icon": "⛓",  "description": "Nhận hoa hồng on-chain lần đầu"},
    {"id": "nft_minted",      "name": "Chủ NFT",            "name_en": "NFT Holder",        "category": "web3",    "wk_reward": 400,  "icon": "🎨", "description": "Sở hữu Reputation NFT"},
    {"id": "creator_token",   "name": "Creator Token",       "name_en": "Creator Token",     "category": "web3",    "wk_reward": 1000, "icon": "🪙",  "description": "Ra mắt Creator Token của riêng mình"},

    # ── Vendor achievements ──
    {"id": "first_product",   "name": "Sản Phẩm Đầu Tiên", "name_en": "First Product",     "category": "vendor",  "wk_reward": 100,  "icon": "📦", "description": "Đăng sản phẩm đầu tiên"},
    {"id": "first_dpp_mint",  "name": "DPP Pioneer Vendor", "name_en": "DPP Pioneer",       "category": "vendor",  "wk_reward": 500,  "icon": "⬡",  "description": "Mint DPP NFT đầu tiên"},
    {"id": "koc_network_10",  "name": "10 KOC Partners",    "name_en": "10 KOC Partners",   "category": "vendor",  "wk_reward": 800,  "icon": "🤝", "description": "Có 10 KOC đang promote sản phẩm"},
    {"id": "vendor_revenue_1b","name": "Tỷ Phú Vendor",    "name_en": "Vendor Billionaire", "category": "vendor",  "wk_reward": 10000,"icon": "🏦", "description": "Doanh thu cộng dồn ₫1,000,000,000"},

    # ── Special / Event achievements ──
    {"id": "group_buy_started","name": "Flash Mob Leader",  "name_en": "Flash Mob Leader",  "category": "special", "wk_reward": 300,  "icon": "⚡", "description": "Khởi động Group Buy đầu tiên"},
    {"id": "tet_2026",        "name": "Tết 2026",           "name_en": "Lunar New Year 2026","category": "special","wk_reward": 500, "icon": "🧧", "description": "Limited: Bán hàng trong dịp Tết 2026"},
    {"id": "beta_pioneer",    "name": "Beta Pioneer",        "name_en": "Beta Pioneer",      "category": "special", "wk_reward": 1000, "icon": "🚀", "description": "Tham gia từ giai đoạn beta (giới hạn)"},
]


class Achievement(Base):
    """Achievement catalog (static definitions)"""
    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    name_en: Mapped[str] = mapped_column(String(200))
    name_zh: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    name_hi: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    name_th: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text)
    icon: Mapped[str] = mapped_column(String(10))
    wk_reward: Mapped[int] = mapped_column(Integer, default=0)
    wk_reward: Mapped[float] = mapped_column(Numeric(18, 8), default=0)
    is_nft_badge: Mapped[bool] = mapped_column(Boolean, default=False)
    nft_token_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_rare: Mapped[bool] = mapped_column(Boolean, default=False)
    is_limited: Mapped[bool] = mapped_column(Boolean, default=False)
    condition: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class UserAchievement(Base):
    """User → Achievement mapping (earned badges)"""
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
        Index("ix_user_achievements_user", "user_id"),
        Index("ix_user_achievements_earned", "earned_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    achievement_id: Mapped[str] = mapped_column(String(50), ForeignKey("achievements.id"))
    earned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    nft_tx_hash: Mapped[Optional[str]] = mapped_column(String(66), nullable=True)
    nft_token_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)  # Show on profile


# ══ MISSIONS ════════════════════════════════════════════════

class MissionType(str, Enum):
    DAILY   = "daily"   # Resets at midnight
    WEEKLY  = "weekly"  # Resets Monday
    MONTHLY = "monthly" # Resets 1st
    SEASON  = "season"  # Quarterly
    ONE_TIME = "one_time"


class MissionStatus(str, Enum):
    ACTIVE    = "active"
    COMPLETED = "completed"
    CLAIMED   = "claimed"
    EXPIRED   = "expired"


class Mission(Base):
    """Mission definitions"""
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    type: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(200))
    name_en: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    icon: Mapped[str] = mapped_column(String(10))

    # Target
    target_event: Mapped[str] = mapped_column(String(50))  # WKEvent
    target_count: Mapped[int] = mapped_column(Integer, default=1)

    # Rewards
    wk_reward: Mapped[int] = mapped_column(Integer, default=0)
    wk_reward: Mapped[float] = mapped_column(Numeric(18, 8), default=0)
    achievement_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Eligibility
    roles: Mapped[list] = mapped_column(JSONB, default=list)  # [] = all roles
    min_tier: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserMission(Base):
    """User's mission progress"""
    __tablename__ = "user_missions"
    __table_args__ = (
        UniqueConstraint("user_id", "mission_id", "period", name="uq_user_mission_period"),
        Index("ix_user_missions_user", "user_id"),
        Index("ix_user_missions_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    mission_id: Mapped[str] = mapped_column(String(50), ForeignKey("missions.id"))
    period: Mapped[str] = mapped_column(String(20))  # "2026-W12", "2026-03", "2026-03-25"
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default=MissionStatus.ACTIVE)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ══ LEADERBOARD ═════════════════════════════════════════════

class LeaderboardEntry(Base):
    """Leaderboard snapshots (weekly/monthly)"""
    __tablename__ = "leaderboard_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "period", "board_type", name="uq_leaderboard_entry"),
        Index("ix_leaderboard_period_type", "period", "board_type"),
        Index("ix_leaderboard_rank", "rank"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    board_type: Mapped[str] = mapped_column(String(30))  # "koc_weekly_gmv", "koc_weekly_orders", "vendor_revenue"
    period: Mapped[str] = mapped_column(String(10))      # "2026-W12"
    rank: Mapped[int] = mapped_column(Integer)
    score: Mapped[float] = mapped_column(Numeric(20, 4))  # GMV or order count
    pool_tier: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # A/B/C
    wk_earned: Mapped[int] = mapped_column(Integer, default=0)
    commission_pool_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ══ DAILY CHECK-IN ══════════════════════════════════════════

class DailyCheckin(Base):
    """Daily check-in records"""
    __tablename__ = "daily_checkins"
    __table_args__ = (
        UniqueConstraint("user_id", "checkin_date", name="uq_checkin_user_date"),
        Index("ix_checkins_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    checkin_date: Mapped[date] = mapped_column(Date)
    streak_day: Mapped[int] = mapped_column(Integer, default=1)
    wk_earned: Mapped[int] = mapped_column(Integer, default=0)
    wk_earned: Mapped[float] = mapped_column(Numeric(18, 8), default=0)
    bonus_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "streak_7", "weekend", etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ══ KOC BATTLE ══════════════════════════════════════════════

class KOCBattle(Base):
    """Head-to-head KOC competition events"""
    __tablename__ = "koc_battles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    challenger_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    opponent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    metric: Mapped[str] = mapped_column(String(30))  # "gmv", "orders", "followers_gained"
    product_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime)
    end_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/active/completed
    challenger_score: Mapped[float] = mapped_column(Numeric(20, 4), default=0)
    opponent_score: Mapped[float] = mapped_column(Numeric(20, 4), default=0)
    winner_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    winner_xp_reward: Mapped[int] = mapped_column(Integer, default=500)
    loser_xp_reward: Mapped[int] = mapped_column(Integer, default=100)
    prize_wk: Mapped[float] = mapped_column(Numeric(18, 8), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
