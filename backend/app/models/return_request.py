"""
WellKOC -- Return Request Model
Handles buyer return/refund requests for delivered orders.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    DateTime, ForeignKey, Numeric, String, Text, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReturnStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REFUNDED = "refunded"


class ReturnReason(str, Enum):
    DAMAGED = "damaged"
    WRONG_ITEM = "wrong_item"
    NOT_AS_DESCRIBED = "not_as_described"
    OTHER = "other"


class RefundMethod(str, Enum):
    ORIGINAL_PAYMENT = "original_payment"
    WALLET_CREDIT = "wallet_credit"


class ReturnRequest(Base):
    __tablename__ = "return_requests"
    __table_args__ = (
        Index("ix_return_requests_order_id", "order_id"),
        Index("ix_return_requests_buyer_id", "buyer_id"),
        Index("ix_return_requests_status", "status"),
        {"schema": None},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_urls: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list
    )
    status: Mapped[str] = mapped_column(String(20), default=ReturnStatus.PENDING)
    vendor_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refund_amount: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    refund_method: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<ReturnRequest {self.id} order={self.order_id} [{self.status}]>"
