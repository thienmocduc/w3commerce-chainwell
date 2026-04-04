"""
WellKOC — Order & Commission Models
State machine: pending → confirmed → packing → shipping → delivered → complete
Commission: T1 40% + T2 13% + Pool A/B/C + Platform 30%
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric,
    String, Text, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PACKING = "packing"
    SHIPPING = "shipping"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDING = "refunding"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    VNPAY = "vnpay"
    MOMO = "momo"
    PAYOS = "payos"
    USDT = "usdt"
    WK_TOKEN = "wk_token"
    COD = "cod"


class CommissionStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SETTLING = "settling"
    SETTLED = "settled"
    FAILED = "failed"
    CLAWBACK = "clawback"


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_buyer_id", "buyer_id"),
        Index("ix_orders_vendor_id", "vendor_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_created_at", "created_at"),
        {"schema": None},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)  # ORD-2026-00001

    # ── Parties ──────────────────────────────────────────────
    buyer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    koc_t1_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # KOC who referred buyer
    koc_t2_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # KOC who referred T1 KOC
    affiliate_link_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)  # FK to share_links.id — add when that table is created

    # ── Items snapshot ───────────────────────────────────────
    items: Mapped[list] = mapped_column(JSONB, default=list)
    # [{product_id, variant_id, name, price, qty, dpp_token_id}]

    # ── Pricing ──────────────────────────────────────────────
    subtotal: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    shipping_fee: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    voucher_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    total: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="VND")

    # ── Payment ──────────────────────────────────────────────
    payment_method: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    payment_tx_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Gateway TX
    payment_paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Shipping ─────────────────────────────────────────────
    shipping_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    shipping_carrier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    shipped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── State ────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.PENDING)
    status_history: Mapped[list] = mapped_column(JSONB, default=list)
    # [{status, timestamp, note, actor_id}]
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)

    # ── Commission flag ──────────────────────────────────────
    commission_calculated: Mapped[bool] = mapped_column(Boolean, default=False)
    commission_settled: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Review ───────────────────────────────────────────────
    review_unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Metadata ─────────────────────────────────────────────
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Commission(Base):
    """On-chain commission record per order per recipient"""
    __tablename__ = "commissions"
    __table_args__ = (
        Index("ix_commissions_koc_id", "koc_id"),
        Index("ix_commissions_order_id", "order_id"),
        Index("ix_commissions_status", "status"),
        Index("ix_commissions_period", "period_week"),
        {"schema": None},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    koc_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # ── Commission details ───────────────────────────────────
    commission_type: Mapped[str] = mapped_column(String(20))  # t1|t2|pool_a|pool_b|pool_c
    rate: Mapped[float] = mapped_column(Numeric(5, 4))  # 0.4000 = 40%
    base_amount: Mapped[float] = mapped_column(Numeric(18, 2))  # Order total
    amount: Mapped[float] = mapped_column(Numeric(18, 2))  # Actual commission
    currency: Mapped[str] = mapped_column(String(3), default="VND")

    # ── Pool weekly ranking ───────────────────────────────────
    period_week: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "2026-W12"
    pool_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── On-chain settlement ──────────────────────────────────
    status: Mapped[str] = mapped_column(String(20), default=CommissionStatus.PENDING)
    tx_hash: Mapped[Optional[str]] = mapped_column(String(66), nullable=True)
    block_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    gas_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Metadata ─────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Commission {self.commission_type} {self.amount} VND [{self.status}]>"
