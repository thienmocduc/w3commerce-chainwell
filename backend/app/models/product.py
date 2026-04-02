"""
WellKOC — Product & DPP NFT Models
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric,
    String, Text, func, Index, text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class ProductStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    OUT_OF_STOCK = "out_of_stock"
    ARCHIVED = "archived"


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_vendor_id", "vendor_id"),
        Index("ix_products_status", "status"),
        Index("ix_products_category", "category"),
        Index("ix_products_dpp_verified", "dpp_verified"),
        # GIN index for full-text search on name + description
        Index(
            "ix_products_fts",
            func.to_tsvector(
                "simple",
                func.coalesce(text("name"), "") + " " + func.coalesce(text("description"), ""),
            ),
            postgresql_using="gin",
        ),
        # GIN trigram indexes for fuzzy search fallback (requires pg_trgm extension)
        Index("ix_products_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
        {"schema": None},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # ── Basic Info ───────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    name_en: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    name_zh: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    name_hi: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    name_th: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Classification ───────────────────────────────────────
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSONB, default=list)

    # ── Pricing ──────────────────────────────────────────────
    price: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    compare_at_price: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    cost_price: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="VND")

    # ── Inventory ────────────────────────────────────────────
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer, default=50)
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)

    # ── Media ────────────────────────────────────────────────
    images: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Physical ─────────────────────────────────────────────
    weight_grams: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dimensions_cm: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # ── DPP / Blockchain ────────────────────────────────────
    dpp_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    dpp_nft_token_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dpp_ipfs_uri: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dpp_tx_hash: Mapped[Optional[str]] = mapped_column(String(66), nullable=True)
    certifications: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    origin_country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lot_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    manufacture_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Analytics ────────────────────────────────────────────
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    order_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_avg: Mapped[float] = mapped_column(Numeric(3, 2), default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)

    # ── AI / Search ──────────────────────────────────────────
    embedding: Mapped[Optional[list]] = mapped_column(Vector(384), nullable=True)

    # ── Status ───────────────────────────────────────────────
    status: Mapped[str] = mapped_column(String(20), default=ProductStatus.DRAFT)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Metadata ─────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def available_stock(self) -> int:
        return max(0, self.stock_quantity - self.reserved_quantity)

    @property
    def discount_pct(self) -> float:
        if self.compare_at_price and self.compare_at_price > self.price:
            return round((1 - self.price / self.compare_at_price) * 100, 1)
        return 0.0


class ProductVariant(Base):
    """Size/color/flavor variants of a product"""
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200))  # e.g. "30ml / Hương Hoa Hồng"
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)
    price: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)  # {"size":"30ml","color":"rose"}
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
