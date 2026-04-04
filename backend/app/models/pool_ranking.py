"""
WellKOC — Pool A/B/C Ranking Models (Module #18)
Weekly KOC ranking pools with on-chain commission distribution
Pool A = Top 1-10 (40%), Pool B = Top 11-50 (35%), Pool C = Top 51-200 (25%)
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric,
    String, func, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PoolTier(str, Enum):
    A = "A"  # Top 1-10 KOCs  — 40% of pool
    B = "B"  # Top 11-50 KOCs — 35% of pool
    C = "C"  # Top 51-200 KOCs — 25% of pool


# Rank score formula: orders x 1 + GMV x 0.5 + CVR x 2 + DPP_sales x 1.5
SCORE_WEIGHTS = {
    "orders": 1.0,
    "gmv": 0.5,
    "cvr": 2.0,
    "dpp_sales": 1.5,
}

POOL_CONFIG_DEFAULTS = {
    PoolTier.A: {"percentage": 40, "min_rank": 1,  "max_rank": 10},
    PoolTier.B: {"percentage": 35, "min_rank": 11, "max_rank": 50},
    PoolTier.C: {"percentage": 25, "min_rank": 51, "max_rank": 200},
}


class PoolRanking(Base):
    """Weekly KOC ranking snapshot per pool"""
    __tablename__ = "pool_rankings"
    __table_args__ = (
        UniqueConstraint("koc_id", "week", "year", name="uq_pool_ranking_koc_week_year"),
        Index("ix_pool_ranking_week_year", "week", "year"),
        Index("ix_pool_ranking_pool", "pool"),
        Index("ix_pool_ranking_rank", "rank"),
        Index("ix_pool_ranking_koc", "koc_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    koc_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    week: Mapped[int] = mapped_column(Integer)           # ISO week number (1-53)
    year: Mapped[int] = mapped_column(Integer)            # e.g. 2026
    pool: Mapped[str] = mapped_column(String(1))          # A / B / C
    rank: Mapped[int] = mapped_column(Integer)            # Overall rank position

    # Score components
    score: Mapped[float] = mapped_column(Numeric(20, 4), default=0)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    gmv: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    cvr: Mapped[float] = mapped_column(Numeric(5, 4), default=0)  # Conversion rate (e.g. 0.2543)
    dpp_sales: Mapped[int] = mapped_column(Integer, default=0)

    # Distribution
    commission_amount: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    tx_hash: Mapped[Optional[str]] = mapped_column(String(66), nullable=True)
    distributed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PoolConfig(Base):
    """Pool configuration (A/B/C percentage splits)"""
    __tablename__ = "pool_configs"
    __table_args__ = (
        UniqueConstraint("pool", name="uq_pool_config_pool"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pool: Mapped[str] = mapped_column(String(1))           # A / B / C
    percentage: Mapped[int] = mapped_column(Integer)        # 40 / 35 / 25
    min_rank: Mapped[int] = mapped_column(Integer)          # 1 / 11 / 51
    max_rank: Mapped[int] = mapped_column(Integer)          # 10 / 50 / 200
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class PoolDistribution(Base):
    """On-chain distribution history log"""
    __tablename__ = "pool_distributions"
    __table_args__ = (
        Index("ix_pool_dist_week_year", "week", "year"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    pool: Mapped[str] = mapped_column(String(1))
    total_amount: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    recipients_count: Mapped[int] = mapped_column(Integer, default=0)
    tx_hash: Mapped[Optional[str]] = mapped_column(String(66), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/processing/completed/failed
    dist_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    distributed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
