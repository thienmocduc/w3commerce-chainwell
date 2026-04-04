"""
WellKOC — Flash Sale Models (Module #33)
Flash sale campaigns with Redis-backed atomic stock counters
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    DateTime, ForeignKey, Integer, Numeric,
    String, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FlashSaleStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE    = "active"
    ENDED     = "ended"
    CANCELLED = "cancelled"


class FlashSale(Base):
    """Flash sale campaign with time-limited discounts"""
    __tablename__ = "flash_sales"
    __table_args__ = (
        Index("ix_flash_sale_product", "product_id"),
        Index("ix_flash_sale_vendor", "vendor_id"),
        Index("ix_flash_sale_status", "status"),
        Index("ix_flash_sale_start", "start_at"),
        Index("ix_flash_sale_end", "end_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    original_price: Mapped[float] = mapped_column(Numeric(20, 2))
    flash_price: Mapped[float] = mapped_column(Numeric(20, 2))
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2))

    quantity_limit: Mapped[int] = mapped_column(Integer)
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0)

    start_at: Mapped[datetime] = mapped_column(DateTime)
    end_at: Mapped[datetime] = mapped_column(DateTime)
    duration_minutes: Mapped[int] = mapped_column(Integer)

    status: Mapped[str] = mapped_column(String(20), default=FlashSaleStatus.SCHEDULED)

    # Performance metrics (populated after sale ends)
    performance_metrics: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Example: {"total_revenue": 50000, "unique_buyers": 120, "avg_checkout_seconds": 8.5,
    #           "peak_concurrent": 350, "conversion_rate": 0.45}

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class FlashSalePurchase(Base):
    """Individual purchase record within a flash sale"""
    __tablename__ = "flash_sale_purchases"
    __table_args__ = (
        Index("ix_fsp_sale", "flash_sale_id"),
        Index("ix_fsp_user", "user_id"),
        Index("ix_fsp_created", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flash_sale_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flash_sales.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(20, 2))
    total_price: Mapped[float] = mapped_column(Numeric(20, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
