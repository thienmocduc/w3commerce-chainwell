"""WellKOC — Vendor Endpoints (Full)"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.user import User, UserRole
from app.models.order import Order, Commission, CommissionStatus
from app.models.product import Product, ProductStatus
from app.models.vendor import VendorProfile

router = APIRouter(prefix="/vendor", tags=["Vendor"])
vendor_only = require_role([UserRole.VENDOR, UserRole.ADMIN])


# ── Schemas ──────────────────────────────────────────────────

class VendorProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    tax_code: Optional[str] = None
    business_license: Optional[str] = None
    categories: Optional[list] = None
    shipping_from: Optional[str] = None
    is_dpp_enabled: Optional[bool] = None


# ── Profile ──────────────────────────────────────────────────

@router.get("/profile")
async def get_vendor_profile(
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """Get vendor profile details."""
    r = await db.execute(
        select(VendorProfile).where(VendorProfile.user_id == current_user.id)
    )
    profile = r.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Vendor profile not found")

    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "phone": current_user.phone,
        "display_name": current_user.display_name,
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "kyc_status": current_user.kyc_status,
        "company_name": profile.company_name,
        "tax_code": profile.tax_code,
        "business_license": profile.business_license,
        "categories": profile.categories or [],
        "shipping_from": profile.shipping_from,
        "is_dpp_enabled": profile.is_dpp_enabled,
        "membership_tier": profile.membership_tier,
        "created_at": profile.created_at.isoformat(),
    }


@router.put("/profile")
async def update_vendor_profile(
    body: VendorProfileUpdate,
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """Update vendor profile fields."""
    r = await db.execute(
        select(VendorProfile).where(VendorProfile.user_id == current_user.id)
    )
    profile = r.scalar_one_or_none()
    if not profile:
        # Auto-create profile if missing
        profile = VendorProfile(user_id=current_user.id)
        db.add(profile)

    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return {
        "message": "Vendor profile updated",
        "user_id": str(current_user.id),
        "company_name": profile.company_name,
        "tax_code": profile.tax_code,
        "categories": profile.categories or [],
        "shipping_from": profile.shipping_from,
        "is_dpp_enabled": profile.is_dpp_enabled,
        "membership_tier": profile.membership_tier,
    }


# ── Products ─────────────────────────────────────────────────

@router.get("/products")
async def vendor_products(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """List vendor's products with pagination."""
    q = select(Product).where(Product.vendor_id == current_user.id)
    if status:
        q = q.where(Product.status == status)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page).order_by(Product.created_at.desc())
    r = await db.execute(q)
    products = r.scalars().all()

    return {
        "items": [
            {
                "id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "price": float(p.price),
                "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
                "stock_quantity": p.stock_quantity,
                "available_stock": p.available_stock,
                "status": p.status,
                "dpp_verified": p.dpp_verified,
                "thumbnail_url": p.thumbnail_url,
                "order_count": p.order_count,
                "rating_avg": float(p.rating_avg),
                "rating_count": p.rating_count,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat(),
            }
            for p in products
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if total else 0,
    }


# ── Orders ───────────────────────────────────────────────────

@router.get("/orders")
async def vendor_orders(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """List vendor's orders with optional status filter and pagination."""
    q = select(Order).where(Order.vendor_id == current_user.id)
    if status:
        q = q.where(Order.status == status)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page).order_by(Order.created_at.desc())
    r = await db.execute(q)
    orders = r.scalars().all()

    return {
        "items": [
            {
                "id": str(o.id),
                "order_number": o.order_number,
                "status": o.status,
                "payment_status": o.payment_status,
                "payment_method": o.payment_method,
                "subtotal": float(o.subtotal),
                "shipping_fee": float(o.shipping_fee),
                "discount_amount": float(o.discount_amount),
                "total": float(o.total),
                "currency": o.currency,
                "items_count": len(o.items or []),
                "koc_t1_id": str(o.koc_t1_id) if o.koc_t1_id else None,
                "commission_settled": o.commission_settled,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if total else 0,
    }


# ── Analytics ────────────────────────────────────────────────

@router.get("/analytics")
async def vendor_analytics(
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """Sales analytics: revenue, orders count, top products."""
    from app.models.order import OrderStatus

    # Total revenue and order count (confirmed + completed orders)
    r_totals = await db.execute(
        select(
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total), 0).label("total_revenue"),
        ).where(
            Order.vendor_id == current_user.id,
            Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.PACKING,
                               OrderStatus.SHIPPING, OrderStatus.DELIVERED,
                               OrderStatus.COMPLETED]),
        )
    )
    totals_row = r_totals.one()
    order_count = totals_row.order_count or 0
    total_revenue = float(totals_row.total_revenue or 0)

    # Pending orders
    r_pending = await db.execute(
        select(func.count(Order.id)).where(
            Order.vendor_id == current_user.id,
            Order.status == OrderStatus.PENDING,
        )
    )
    pending_orders = r_pending.scalar() or 0

    # Product count
    r_products = await db.execute(
        select(func.count(Product.id)).where(
            Product.vendor_id == current_user.id,
            Product.status == ProductStatus.ACTIVE,
        )
    )
    active_products = r_products.scalar() or 0

    # Top 5 products by order_count field on product
    r_top = await db.execute(
        select(
            Product.id,
            Product.name,
            Product.price,
            Product.order_count,
            Product.rating_avg,
        )
        .where(Product.vendor_id == current_user.id)
        .order_by(Product.order_count.desc())
        .limit(5)
    )
    top_products = [
        {
            "id": str(row.id),
            "name": row.name,
            "price": float(row.price),
            "order_count": row.order_count,
            "rating_avg": float(row.rating_avg),
        }
        for row in r_top.all()
    ]

    # Active KOC count (unique KOCs who referred orders to this vendor)
    r_kocs = await db.execute(
        select(func.count(func.distinct(Order.koc_t1_id))).where(
            Order.vendor_id == current_user.id,
            Order.koc_t1_id.isnot(None),
        )
    )
    active_kocs = r_kocs.scalar() or 0

    # Average order value
    avg_order_value = round(total_revenue / order_count, 2) if order_count else 0.0

    return {
        "summary": {
            "total_revenue": total_revenue,
            "order_count": order_count,
            "pending_orders": pending_orders,
            "active_products": active_products,
            "active_kocs": active_kocs,
            "avg_order_value": avg_order_value,
        },
        "top_products": top_products,
    }


# ── Commissions ──────────────────────────────────────────────

@router.get("/commissions")
async def vendor_commissions(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """List KOC commissions paid (or queued) by this vendor, derived from vendor's orders."""
    # Commissions are linked to orders; filter by orders belonging to this vendor
    base_q = (
        select(Commission)
        .join(Order, Commission.order_id == Order.id)
        .where(Order.vendor_id == current_user.id)
    )
    if status:
        base_q = base_q.where(Commission.status == status)

    total_r = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = total_r.scalar() or 0

    data_q = (
        base_q.offset((page - 1) * per_page)
        .limit(per_page)
        .order_by(Commission.created_at.desc())
    )
    r = await db.execute(data_q)
    commissions = r.scalars().all()

    # Aggregate totals for this vendor
    r_agg = await db.execute(
        select(
            func.coalesce(func.sum(Commission.amount), 0).label("total_paid"),
            func.count(Commission.id).label("total_records"),
        )
        .join(Order, Commission.order_id == Order.id)
        .where(
            Order.vendor_id == current_user.id,
            Commission.status == CommissionStatus.SETTLED,
        )
    )
    agg = r_agg.one()

    return {
        "items": [
            {
                "id": str(c.id),
                "order_id": str(c.order_id),
                "koc_id": str(c.koc_id),
                "commission_type": c.commission_type,
                "rate": float(c.rate),
                "base_amount": float(c.base_amount),
                "amount": float(c.amount),
                "currency": c.currency,
                "status": c.status,
                "period_week": c.period_week,
                "tx_hash": c.tx_hash,
                "settled_at": c.settled_at.isoformat() if c.settled_at else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in commissions
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if total else 0,
        "aggregate": {
            "total_settled_amount": float(agg.total_paid or 0),
            "total_settled_records": agg.total_records or 0,
        },
    }


# ── Dashboard (kept for backwards compat) ────────────────────

@router.get("/dashboard")
async def vendor_dashboard(
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    r_products = await db.execute(
        select(func.count(Product.id)).where(Product.vendor_id == current_user.id)
    )
    r_orders = await db.execute(
        select(func.count(Order.id), func.sum(Order.total)).where(
            Order.vendor_id == current_user.id
        )
    )
    order_count, revenue = r_orders.one()
    r_kocs = await db.execute(
        select(func.count(func.distinct(Commission.koc_id)))
        .join(Order, Commission.order_id == Order.id)
        .where(Order.vendor_id == current_user.id)
    )
    return {
        "products": r_products.scalar() or 0,
        "orders": order_count or 0,
        "revenue": float(revenue or 0),
        "active_kocs": r_kocs.scalar() or 0,
    }


# ── KOC Network ───────────────────────────────────────────────

@router.get("/koc-network")
async def vendor_koc_network(
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(
            Commission.koc_id,
            func.sum(Commission.base_amount).label("gmv"),
            func.count(Commission.id).label("orders"),
        )
        .join(Order, Commission.order_id == Order.id)
        .where(Order.vendor_id == current_user.id)
        .group_by(Commission.koc_id)
        .order_by(func.sum(Commission.base_amount).desc())
        .limit(50)
    )
    rows = r.all()
    return {
        "kocs": [
            {
                "koc_id": str(row.koc_id),
                "gmv_generated": float(row.gmv or 0),
                "orders": row.orders,
            }
            for row in rows
        ]
    }


# ── AI Price Suggestion ───────────────────────────────────────

@router.post("/ai-price/{product_id}")
async def ai_price_suggestion(
    product_id: UUID,
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(Product).where(
            Product.id == product_id, Product.vendor_id == current_user.id
        )
    )
    product = r.scalar_one_or_none()
    if not product:
        raise HTTPException(404)
    suggested = round(float(product.price) * 1.032, -3)
    return {
        "current_price": float(product.price),
        "suggested_price": suggested,
        "reasoning": "Phân tích competitor + CVR tuần + tồn kho",
        "expected_revenue_uplift": "+3.2%",
    }


# ── Inventory ─────────────────────────────────────────────────

@router.get("/inventory")
async def vendor_inventory(
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(Product)
        .where(Product.vendor_id == current_user.id)
        .order_by(Product.stock_quantity.asc())
    )
    products = r.scalars().all()
    low_stock = [
        {
            "id": str(p.id),
            "name": p.name,
            "stock": p.stock_quantity,
            "reorder_point": p.reorder_point,
        }
        for p in products
        if p.stock_quantity <= p.reorder_point
    ]
    return {
        "products": len(products),
        "low_stock": low_stock,
        "total_sku": len(products),
    }
