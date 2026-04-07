"""
WellKOC — Flash Sale Trigger Engine Endpoints (Module #33)
POST /flashsale              Create flash sale (vendor/admin)
GET  /flashsale/active       List active flash sales with countdown
GET  /flashsale/suggest      AI suggests optimal flash sale timing
GET  /flashsale/history      Past flash sales with performance metrics
GET  /flashsale/{id}         Detail with real-time remaining quantity
POST /flashsale/{id}/purchase  Atomic purchase (Redis DECR for stock)
PUT  /flashsale/{id}/cancel  Cancel flash sale, restore stock
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.api.v1.deps import get_current_user, require_role, Pagination, CurrentUser
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.flash_sale import FlashSale, FlashSaleStatus, FlashSalePurchase

router = APIRouter(prefix="/flashsale", tags=["Flash Sale"])

# Redis key prefix for flash sale stock counters
REDIS_FLASH_STOCK_KEY = "flashsale:stock:{sale_id}"
REDIS_FLASH_LOCK_KEY = "flashsale:lock:{sale_id}:{user_id}"


# ── Schemas ──────────────────────────────────────────────────

class FlashSaleCreate(BaseModel):
    product_id: uuid.UUID
    discount_percent: float = Field(..., gt=0, le=99, description="Discount percentage")
    flash_price: float = Field(..., gt=0, description="Flash sale price")
    quantity_limit: int = Field(..., ge=1, le=100000, description="Total quantity available")
    start_at: datetime = Field(..., description="Flash sale start time (UTC)")
    duration_minutes: int = Field(..., ge=1, le=1440, description="Duration in minutes")


class FlashSalePurchaseRequest(BaseModel):
    quantity: int = Field(1, ge=1, le=10, description="Quantity to purchase (max 10 per transaction)")


class FlashSaleOut(BaseModel):
    id: str
    product_id: str
    vendor_id: str
    original_price: float
    flash_price: float
    discount_percent: float
    quantity_limit: int
    quantity_sold: int
    quantity_remaining: int
    start_at: datetime
    end_at: datetime
    duration_minutes: int
    status: str
    countdown_seconds: Optional[int] = None
    performance_metrics: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FlashSaleDetailOut(FlashSaleOut):
    recent_purchases: list[dict] = []


class SuggestOut(BaseModel):
    suggested_times: list[dict]
    reasoning: str


# ── Helpers ──────────────────────────────────────────────────

def _flash_stock_key(sale_id: uuid.UUID) -> str:
    return REDIS_FLASH_STOCK_KEY.format(sale_id=str(sale_id))


def _flash_lock_key(sale_id: uuid.UUID, user_id: uuid.UUID) -> str:
    return REDIS_FLASH_LOCK_KEY.format(sale_id=str(sale_id), user_id=str(user_id))


def _build_flash_sale_out(fs: FlashSale, remaining: Optional[int] = None) -> dict:
    now = datetime.now(timezone.utc)
    start_aware = fs.start_at.replace(tzinfo=timezone.utc) if fs.start_at.tzinfo is None else fs.start_at
    end_aware = fs.end_at.replace(tzinfo=timezone.utc) if fs.end_at.tzinfo is None else fs.end_at

    if fs.status == FlashSaleStatus.SCHEDULED and now < start_aware:
        countdown = int((start_aware - now).total_seconds())
    elif fs.status == FlashSaleStatus.ACTIVE and now < end_aware:
        countdown = int((end_aware - now).total_seconds())
    else:
        countdown = 0

    qty_remaining = remaining if remaining is not None else (fs.quantity_limit - fs.quantity_sold)

    return {
        "id": str(fs.id),
        "product_id": str(fs.product_id),
        "vendor_id": str(fs.vendor_id),
        "original_price": float(fs.original_price),
        "flash_price": float(fs.flash_price),
        "discount_percent": fs.discount_percent,
        "quantity_limit": fs.quantity_limit,
        "quantity_sold": fs.quantity_sold,
        "quantity_remaining": max(0, qty_remaining),
        "start_at": fs.start_at,
        "end_at": fs.end_at,
        "duration_minutes": fs.duration_minutes,
        "status": fs.status,
        "countdown_seconds": max(0, countdown),
        "performance_metrics": fs.performance_metrics,
        "created_at": fs.created_at,
    }


# ── Endpoints ────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_flash_sale(
    body: FlashSaleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a flash sale (vendor or admin).
    Validates stock and sets Redis counter for oversell prevention.
    """
    # Only vendors and admins can create flash sales
    if current_user.role not in (UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Only vendors or admins can create flash sales")

    # Verify product exists and is active
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    if product.status != "active":
        raise HTTPException(400, "Product must be active to create a flash sale")

    # Check no overlapping active/scheduled flash sale for this product
    existing = await db.execute(
        select(FlashSale).where(
            FlashSale.product_id == body.product_id,
            FlashSale.status.in_([FlashSaleStatus.SCHEDULED, FlashSaleStatus.ACTIVE]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "An active or scheduled flash sale already exists for this product")

    # Validate flash price vs original
    original_price = float(product.price)
    if body.flash_price >= original_price:
        raise HTTPException(400, "Flash price must be lower than original price")

    end_at = body.start_at + timedelta(minutes=body.duration_minutes)

    flash_sale = FlashSale(
        product_id=body.product_id,
        vendor_id=current_user.id,
        original_price=original_price,
        flash_price=body.flash_price,
        discount_percent=body.discount_percent,
        quantity_limit=body.quantity_limit,
        quantity_sold=0,
        start_at=body.start_at,
        end_at=end_at,
        duration_minutes=body.duration_minutes,
        status=FlashSaleStatus.SCHEDULED,
    )
    db.add(flash_sale)
    await db.commit()
    await db.refresh(flash_sale)

    # Set Redis stock counter for atomic decrement during purchases
    redis = await get_redis()
    await redis.set(_flash_stock_key(flash_sale.id), body.quantity_limit)
    # Set TTL slightly beyond end time to auto-cleanup
    ttl_seconds = int((end_at - datetime.now(timezone.utc)).total_seconds()) + 3600
    await redis.expire(_flash_stock_key(flash_sale.id), max(ttl_seconds, 3600))

    return _build_flash_sale_out(flash_sale, remaining=body.quantity_limit)


@router.get("/active")
async def list_active_flash_sales(
    pagination: Pagination,
    db: AsyncSession = Depends(get_db),
):
    """List active flash sales with countdown timers."""
    now = datetime.now(timezone.utc)

    # Auto-activate scheduled sales whose start_at has passed
    await db.execute(
        update(FlashSale)
        .where(
            FlashSale.status == FlashSaleStatus.SCHEDULED,
            FlashSale.start_at <= now,
        )
        .values(status=FlashSaleStatus.ACTIVE)
    )

    # Auto-end expired active sales
    await db.execute(
        update(FlashSale)
        .where(
            FlashSale.status == FlashSaleStatus.ACTIVE,
            FlashSale.end_at <= now,
        )
        .values(status=FlashSaleStatus.ENDED)
    )
    await db.commit()

    # Fetch active + upcoming scheduled
    query = (
        select(FlashSale)
        .where(FlashSale.status.in_([FlashSaleStatus.ACTIVE, FlashSaleStatus.SCHEDULED]))
        .order_by(FlashSale.start_at.asc())
        .offset(pagination.offset)
        .limit(pagination.per_page)
    )
    result = await db.execute(query)
    sales = result.scalars().all()

    return {
        "flash_sales": [_build_flash_sale_out(fs) for fs in sales],
        "total": len(sales),
    }


@router.get("/suggest")
async def suggest_flash_sale_timing(
    product_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    AI suggests optimal flash sale timing based on traffic patterns.
    Returns suggested time slots with reasoning.
    """
    # Analyze historical flash sale performance
    past_sales_q = (
        select(
            func.extract("hour", FlashSale.start_at).label("hour"),
            func.extract("dow", FlashSale.start_at).label("dow"),
            func.avg(FlashSale.quantity_sold).label("avg_sold"),
            func.count(FlashSale.id).label("sale_count"),
        )
        .where(FlashSale.status == FlashSaleStatus.ENDED)
        .group_by("hour", "dow")
        .order_by(func.avg(FlashSale.quantity_sold).desc())
        .limit(10)
    )
    result = await db.execute(past_sales_q)
    patterns = result.all()

    # Default suggestions if no historical data
    if not patterns:
        return SuggestOut(
            suggested_times=[
                {"day": "Monday", "hour": 12, "reason": "Lunch break peak traffic"},
                {"day": "Wednesday", "hour": 20, "reason": "Mid-week evening shopping"},
                {"day": "Friday", "hour": 19, "reason": "Weekend kickoff impulse buying"},
                {"day": "Saturday", "hour": 10, "reason": "Weekend morning browsing"},
            ],
            reasoning="Default suggestions based on e-commerce traffic patterns. "
                      "More data will improve suggestions over time.",
        )

    days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    suggested = []
    for p in patterns[:5]:
        dow = int(p.dow) if p.dow is not None else 0
        suggested.append({
            "day": days[dow],
            "hour": int(p.hour) if p.hour is not None else 12,
            "avg_quantity_sold": round(float(p.avg_sold), 1),
            "historical_sales": p.sale_count,
            "reason": f"Best performing time slot ({p.sale_count} past sales, avg {float(p.avg_sold):.0f} units sold)",
        })

    return SuggestOut(
        suggested_times=suggested,
        reasoning="Suggestions based on historical flash sale performance data.",
    )


@router.get("/history")
async def flash_sale_history(
    vendor_id: Optional[uuid.UUID] = Query(None),
    *,
    pagination: Pagination,
    db: AsyncSession = Depends(get_db),
):
    """Past flash sales with performance metrics."""
    query = (
        select(FlashSale)
        .where(FlashSale.status.in_([FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED]))
        .order_by(FlashSale.end_at.desc())
    )

    if vendor_id:
        query = query.where(FlashSale.vendor_id == vendor_id)

    query = query.offset(pagination.offset).limit(pagination.per_page)
    result = await db.execute(query)
    sales = result.scalars().all()

    return {
        "flash_sales": [_build_flash_sale_out(fs) for fs in sales],
        "total": len(sales),
    }


@router.get("/{sale_id}")
async def get_flash_sale(
    sale_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Flash sale detail with real-time remaining quantity from Redis."""
    result = await db.execute(select(FlashSale).where(FlashSale.id == sale_id))
    fs = result.scalar_one_or_none()
    if not fs:
        raise HTTPException(404, "Flash sale not found")

    # Get real-time remaining from Redis
    remaining = None
    try:
        redis = await get_redis()
        stock = await redis.get(_flash_stock_key(sale_id))
        if stock is not None:
            remaining = max(0, int(stock))
    except Exception:
        pass  # Fallback to DB value

    # Get recent purchases
    purchases_r = await db.execute(
        select(FlashSalePurchase)
        .where(FlashSalePurchase.flash_sale_id == sale_id)
        .order_by(FlashSalePurchase.created_at.desc())
        .limit(20)
    )
    purchases = purchases_r.scalars().all()

    out = _build_flash_sale_out(fs, remaining=remaining)
    out["recent_purchases"] = [
        {
            "id": str(p.id),
            "user_id": str(p.user_id),
            "quantity": p.quantity,
            "unit_price": float(p.unit_price),
            "total_price": float(p.total_price),
            "created_at": p.created_at,
        }
        for p in purchases
    ]

    return out


@router.post("/{sale_id}/purchase")
async def purchase_flash_sale(
    sale_id: uuid.UUID,
    body: FlashSalePurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomic flash sale purchase using Redis DECRBY for oversell prevention.
    Steps:
    1. Redis DECRBY to atomically reserve stock
    2. If stock < 0, INCRBY to rollback and return sold-out
    3. Record purchase in DB
    4. Update DB quantity_sold
    """
    result = await db.execute(select(FlashSale).where(FlashSale.id == sale_id))
    fs = result.scalar_one_or_none()
    if not fs:
        raise HTTPException(404, "Flash sale not found")

    # Check status
    now = datetime.now(timezone.utc)
    start_aware = fs.start_at.replace(tzinfo=timezone.utc) if fs.start_at.tzinfo is None else fs.start_at
    end_aware = fs.end_at.replace(tzinfo=timezone.utc) if fs.end_at.tzinfo is None else fs.end_at

    if fs.status == FlashSaleStatus.SCHEDULED and now < start_aware:
        raise HTTPException(400, "Flash sale has not started yet")
    if fs.status == FlashSaleStatus.ENDED:
        raise HTTPException(400, "Flash sale has ended")
    if fs.status == FlashSaleStatus.CANCELLED:
        raise HTTPException(400, "Flash sale was cancelled")
    if now >= end_aware:
        # Auto-end
        fs.status = FlashSaleStatus.ENDED
        await db.commit()
        raise HTTPException(400, "Flash sale has ended")

    # Auto-activate if scheduled and time has come
    if fs.status == FlashSaleStatus.SCHEDULED and now >= start_aware:
        fs.status = FlashSaleStatus.ACTIVE
        await db.commit()

    redis = await get_redis()
    stock_key = _flash_stock_key(sale_id)

    # Prevent same user from buying too frequently (1 purchase per 30 seconds)
    lock_key = _flash_lock_key(sale_id, current_user.id)
    if await redis.get(lock_key):
        raise HTTPException(429, "Please wait before purchasing again")

    # Atomic stock decrement
    remaining = await redis.decrby(stock_key, body.quantity)

    if remaining < 0:
        # Rollback — stock oversold
        await redis.incrby(stock_key, body.quantity)
        raise HTTPException(
            409,
            f"Not enough stock. Only {remaining + body.quantity} items remaining."
        )

    # Set purchase lock (30 second cooldown)
    await redis.setex(lock_key, 30, "1")

    # Record purchase in DB
    total_price = float(fs.flash_price) * body.quantity
    purchase = FlashSalePurchase(
        flash_sale_id=sale_id,
        user_id=current_user.id,
        quantity=body.quantity,
        unit_price=float(fs.flash_price),
        total_price=total_price,
    )
    db.add(purchase)

    # Update DB quantity_sold
    await db.execute(
        update(FlashSale)
        .where(FlashSale.id == sale_id)
        .values(quantity_sold=FlashSale.quantity_sold + body.quantity)
    )

    # Auto-end if sold out
    if remaining == 0:
        await db.execute(
            update(FlashSale)
            .where(FlashSale.id == sale_id)
            .values(status=FlashSaleStatus.ENDED)
        )

    await db.commit()

    return {
        "success": True,
        "purchase_id": str(purchase.id),
        "quantity": body.quantity,
        "unit_price": float(fs.flash_price),
        "total_price": total_price,
        "remaining_stock": max(0, remaining),
        "flash_sale_id": str(sale_id),
    }


@router.put("/{sale_id}/cancel")
async def cancel_flash_sale(
    sale_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a flash sale and restore stock in Redis."""
    result = await db.execute(select(FlashSale).where(FlashSale.id == sale_id))
    fs = result.scalar_one_or_none()
    if not fs:
        raise HTTPException(404, "Flash sale not found")

    # Only creator or admin can cancel
    if fs.vendor_id != current_user.id and current_user.role not in (
        UserRole.ADMIN, UserRole.SUPER_ADMIN
    ):
        raise HTTPException(403, "Only the creator or an admin can cancel this flash sale")

    if fs.status in (FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED):
        raise HTTPException(400, f"Cannot cancel a flash sale with status: {fs.status}")

    # Update DB status
    fs.status = FlashSaleStatus.CANCELLED
    fs.performance_metrics = {
        **(fs.performance_metrics or {}),
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancelled_by": str(current_user.id),
        "quantity_sold_at_cancel": fs.quantity_sold,
    }

    # Restore remaining stock in Redis (or just delete the key)
    try:
        redis = await get_redis()
        await redis.delete(_flash_stock_key(sale_id))
    except Exception:
        pass  # Redis cleanup is best-effort

    await db.commit()
    await db.refresh(fs)

    return _build_flash_sale_out(fs)
