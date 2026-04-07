"""
WellKOC — Module #8: AI Product Recommendation Engine
Hybrid algorithm: 60% collaborative + 20% trending + 20% KOC-followed
"""
import time
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, OptionalUser, Pagination
from app.models.product import Product, ProductStatus
from app.models.order import Order
from app.models.social import Follow
from app.models.user import User
from app.models.recommendation import UserBehaviorEvent, BehaviorEventType

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# ── In-memory cache (user_id -> {products, timestamp}) ────────
_recommendation_cache: dict[str, dict] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_cached(user_id: str, context: str) -> Optional[list]:
    key = f"{user_id}:{context}"
    entry = _recommendation_cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL_SECONDS:
        return entry["products"]
    return None


def _set_cache(user_id: str, context: str, products: list):
    key = f"{user_id}:{context}"
    _recommendation_cache[key] = {"products": products, "ts": time.time()}


# ── Schemas ──────────────────────────────────────────────────

class ProductBrief(BaseModel):
    id: UUID
    name: str
    category: str
    price: float
    thumbnail_url: Optional[str] = None
    rating_avg: float = 0
    order_count: int = 0
    dpp_verified: bool = False
    score: float = 0  # recommendation relevance score

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    items: list[ProductBrief]
    total: int
    algorithm: str
    cached: bool = False


class BehaviorEventRequest(BaseModel):
    product_id: UUID
    event_type: str = Field(
        ..., pattern="^(view|add_to_cart|purchase|wishlist)$"
    )
    context: Optional[str] = Field(
        None, pattern="^(homepage|product|cart|search|live)$"
    )


class BehaviorEventResponse(BaseModel):
    status: str
    event_id: UUID


# ── Helpers ──────────────────────────────────────────────────

def _product_to_brief(p: Product, score: float = 0) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "category": p.category,
        "price": float(p.price),
        "thumbnail_url": p.thumbnail_url,
        "rating_avg": float(p.rating_avg),
        "order_count": p.order_count,
        "dpp_verified": p.dpp_verified,
        "score": round(score, 4),
    }


# ── GET /recommendations — personalized hybrid ──────────────

@router.get("", response_model=RecommendationResponse)
async def get_recommendations(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    context: str = Query("homepage", pattern="^(homepage|product|cart)$"),
    limit: int = Query(20, ge=1, le=100),
):
    """Personalized product recommendations.
    Algorithm: 60% collaborative filtering + 20% trending + 20% KOC-followed.
    Results cached in-memory for 5 minutes.
    """
    user_id = str(current_user.id)

    # Check in-memory cache
    cached = _get_cached(user_id, context)
    if cached:
        return RecommendationResponse(
            items=cached[:limit], total=len(cached[:limit]),
            algorithm="hybrid", cached=True,
        )

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    # ── 1) Collaborative filtering (60%) ─────────────────────
    # Find products bought by users who bought the same products as current user
    # Step a: products the current user purchased
    user_products_q = (
        select(UserBehaviorEvent.product_id)
        .where(
            UserBehaviorEvent.user_id == current_user.id,
            UserBehaviorEvent.event_type == BehaviorEventType.PURCHASE,
        )
    )
    user_product_ids = (await db.execute(user_products_q)).scalars().all()

    collab_products: list[dict] = []
    if user_product_ids:
        # Step b: find other users who bought the same products
        similar_users_q = (
            select(UserBehaviorEvent.user_id)
            .where(
                UserBehaviorEvent.product_id.in_(user_product_ids),
                UserBehaviorEvent.event_type == BehaviorEventType.PURCHASE,
                UserBehaviorEvent.user_id != current_user.id,
            )
            .distinct()
            .limit(50)
        )
        similar_user_ids = (await db.execute(similar_users_q)).scalars().all()

        if similar_user_ids:
            # Step c: products those users bought that current user hasn't
            collab_q = (
                select(
                    Product,
                    func.count(UserBehaviorEvent.id).label("co_count"),
                )
                .join(
                    UserBehaviorEvent,
                    UserBehaviorEvent.product_id == Product.id,
                )
                .where(
                    UserBehaviorEvent.user_id.in_(similar_user_ids),
                    UserBehaviorEvent.event_type == BehaviorEventType.PURCHASE,
                    Product.id.notin_(user_product_ids),
                    Product.status == ProductStatus.ACTIVE,
                )
                .group_by(Product.id)
                .order_by(desc("co_count"))
                .limit(limit)
            )
            collab_rows = (await db.execute(collab_q)).all()
            max_co = collab_rows[0][1] if collab_rows else 1
            collab_products = [
                _product_to_brief(row[0], score=(row[1] / max_co) * 0.6)
                for row in collab_rows
            ]

    # ── 2) Trending (20%) ────────────────────────────────────
    trending_q = (
        select(Product)
        .where(
            Product.status == ProductStatus.ACTIVE,
            Product.created_at >= seven_days_ago,
        )
        .order_by(desc(Product.order_count))
        .limit(limit)
    )
    trending_rows = (await db.execute(trending_q)).scalars().all()
    max_orders = trending_rows[0].order_count if trending_rows and trending_rows[0].order_count else 1
    trending_products = [
        _product_to_brief(p, score=(p.order_count / max_orders) * 0.2)
        for p in trending_rows
    ]

    # ── 3) KOC-followed (20%) ────────────────────────────────
    # Products from vendors/KOCs that the user follows
    following_q = (
        select(Follow.following_id)
        .where(Follow.follower_id == current_user.id)
    )
    following_ids = (await db.execute(following_q)).scalars().all()

    koc_products: list[dict] = []
    if following_ids:
        koc_q = (
            select(Product)
            .where(
                Product.vendor_id.in_(following_ids),
                Product.status == ProductStatus.ACTIVE,
            )
            .order_by(desc(Product.order_count))
            .limit(limit)
        )
        koc_rows = (await db.execute(koc_q)).scalars().all()
        max_koc_orders = koc_rows[0].order_count if koc_rows and koc_rows[0].order_count else 1
        koc_products = [
            _product_to_brief(p, score=(p.order_count / max_koc_orders) * 0.2)
            for p in koc_rows
        ]

    # ── Merge & deduplicate by product id ────────────────────
    seen: set[UUID] = set()
    merged: list[dict] = []
    for item in collab_products + koc_products + trending_products:
        pid = item["id"]
        if pid not in seen:
            seen.add(pid)
            merged.append(item)

    # Sort by combined score descending
    merged.sort(key=lambda x: x["score"], reverse=True)
    final = merged[:limit]

    # Fallback: if not enough results, fill with popular products
    if len(final) < limit:
        fallback_q = (
            select(Product)
            .where(
                Product.status == ProductStatus.ACTIVE,
                Product.id.notin_(seen) if seen else True,
            )
            .order_by(desc(Product.order_count))
            .limit(limit - len(final))
        )
        fallback_rows = (await db.execute(fallback_q)).scalars().all()
        final.extend([_product_to_brief(p, score=0.01) for p in fallback_rows])

    _set_cache(user_id, context, final)

    return RecommendationResponse(
        items=final[:limit], total=len(final[:limit]),
        algorithm="hybrid", cached=False,
    )


# ── GET /recommendations/trending ────────────────────────────

@router.get("/trending", response_model=RecommendationResponse)
async def get_trending(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """Trending products in the last 7 days by sold_count (order_count)."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    q = (
        select(Product)
        .where(
            Product.status == ProductStatus.ACTIVE,
            Product.updated_at >= seven_days_ago,
        )
        .order_by(desc(Product.order_count))
        .limit(limit)
    )
    rows = (await db.execute(q)).scalars().all()
    items = [_product_to_brief(p, score=float(p.order_count)) for p in rows]

    return RecommendationResponse(
        items=items, total=len(items),
        algorithm="trending", cached=False,
    )


# ── GET /recommendations/similar/{product_id} ────────────────

@router.get("/similar/{product_id}", response_model=RecommendationResponse)
async def get_similar_products(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """Similar products: same category + within 50% price range."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Sản phẩm không tồn tại")

    price_low = float(product.price) * 0.5
    price_high = float(product.price) * 1.5

    q = (
        select(Product)
        .where(
            Product.category == product.category,
            Product.id != product_id,
            Product.status == ProductStatus.ACTIVE,
            Product.price >= price_low,
            Product.price <= price_high,
        )
        .order_by(desc(Product.rating_avg), desc(Product.order_count))
        .limit(limit)
    )
    rows = (await db.execute(q)).scalars().all()
    items = [_product_to_brief(p, score=float(p.rating_avg)) for p in rows]

    return RecommendationResponse(
        items=items, total=len(items),
        algorithm="similar", cached=False,
    )


# ── POST /recommendations/events ─────────────────────────────

@router.post("/events", response_model=BehaviorEventResponse, status_code=201)
async def track_behavior_event(
    body: BehaviorEventRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Track user behavior events: view, add_to_cart, purchase, wishlist."""
    # Verify product exists
    result = await db.execute(select(Product.id).where(Product.id == body.product_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Sản phẩm không tồn tại")

    event = UserBehaviorEvent(
        user_id=current_user.id,
        product_id=body.product_id,
        event_type=body.event_type,
        context=body.context,
    )
    db.add(event)
    await db.commit()

    return BehaviorEventResponse(status="tracked", event_id=event.id)
