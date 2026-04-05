"""
WellKOC — Reviews Endpoints (Module #7 — On-chain Review System)
POST   /reviews                       Create review (48h window after delivery)
GET    /reviews/product/{product_id}   Product reviews (paginated, sortable)
GET    /reviews/stats/{product_id}     Aggregate stats (avg rating, per-star counts)
PUT    /reviews/{id}/flag              Vendor flags review for moderation
DELETE /reviews/{id}                   Admin removes review (with reason)
"""
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, case, desc, asc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.review import Review, ReviewStatus
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/reviews", tags=["Reviews"])

# ── Review window: buyer can review within 48h after delivery ─
REVIEW_WINDOW_HOURS = 48


# ── Schemas ──────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    product_id: UUID
    order_id: UUID
    rating: int = Field(..., ge=1, le=5)
    text: Optional[str] = Field(None, max_length=2000)
    media_urls: Optional[list[str]] = Field(None, max_length=10)


class ReviewOut(BaseModel):
    id: UUID
    product_id: UUID
    order_id: UUID
    user_id: UUID
    rating: int
    text: Optional[str] = None
    media_urls: Optional[list[str]] = None
    content_hash: Optional[str] = None
    status: str
    is_verified: bool
    helpful_count: int
    created_at: Optional[datetime] = None
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewStats(BaseModel):
    product_id: UUID
    total_reviews: int
    avg_rating: float
    star_counts: dict[str, int]  # {"1": 5, "2": 3, ...}


class FlagRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)


class RemoveRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)


# ── Helpers ──────────────────────────────────────────────────

def _hash_review_content(rating: int, text: Optional[str], media_urls: Optional[list[str]], product_id: str, user_id: str) -> str:
    """SHA-256 hash of review content for on-chain integrity verification."""
    payload = json.dumps({
        "rating": rating,
        "text": text or "",
        "media_urls": sorted(media_urls or []),
        "product_id": product_id,
        "user_id": user_id,
    }, sort_keys=True, ensure_ascii=False)
    return "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


# ── Endpoints ────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_review(
    body: ReviewCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a product review. Requirements:
    - Order must be delivered
    - Within 48-hour review window after delivery
    - Content is hashed (SHA-256) for on-chain integrity
    """
    # Verify order belongs to user and is delivered
    result = await db.execute(
        select(Order).where(
            Order.id == body.order_id,
            Order.buyer_id == current_user.id,
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Đơn hàng không tồn tại")

    if order.status not in (OrderStatus.DELIVERED, OrderStatus.COMPLETED):
        raise HTTPException(403, "Cần hoàn thành đơn hàng trước khi đánh giá")

    # Check 48h window
    if order.delivered_at:
        window_end = order.delivered_at + timedelta(hours=REVIEW_WINDOW_HOURS)
        now = datetime.now(timezone.utc)
        if now > window_end:
            raise HTTPException(
                403,
                f"Đã hết thời gian đánh giá ({REVIEW_WINDOW_HOURS}h sau khi nhận hàng)",
            )

    # Check not already reviewed
    if order.reviewed_at:
        raise HTTPException(409, "Đơn hàng này đã được đánh giá")

    # Hash review content for on-chain integrity
    content_hash = _hash_review_content(
        rating=body.rating,
        text=body.text,
        media_urls=body.media_urls,
        product_id=str(body.product_id),
        user_id=str(current_user.id),
    )

    review = Review(
        product_id=body.product_id,
        order_id=body.order_id,
        user_id=current_user.id,
        rating=body.rating,
        comment=body.text,
        media_urls=body.media_urls,
        content_hash=content_hash,
        status=ReviewStatus.ACTIVE,
        is_verified=True,
    )
    db.add(review)

    # Mark order as reviewed
    order.reviewed_at = datetime.now(timezone.utc)
    order.review_unlocked = True
    db.add(order)

    await db.commit()
    await db.refresh(review)

    # Award gamification XP
    try:
        from app.services.gamification_service import GamificationService
        from app.models.gamification import WKEvent
        svc = GamificationService(db)
        await svc.award_wk(current_user.id, WKEvent.PRODUCT_REVIEWED, reference_id=str(body.order_id))
    except Exception:
        pass  # Gamification failure should not block review creation

    return {
        "status": "created",
        "id": str(review.id),
        "rating": body.rating,
        "content_hash": content_hash,
        "wk_earned": 20,
    }


@router.get("/product/{product_id}")
async def product_reviews(
    product_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    sort_by: str = Query("recent", enum=["recent", "highest", "lowest", "helpful"]),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated reviews for a product. Excludes removed reviews."""
    offset = (page - 1) * per_page

    # Sorting
    order_clause = {
        "recent": desc(Review.created_at),
        "highest": desc(Review.rating),
        "lowest": asc(Review.rating),
        "helpful": desc(Review.helpful_count),
    }[sort_by]

    # Total count (active + flagged, not removed)
    count_q = select(func.count()).select_from(Review).where(
        Review.product_id == product_id,
        Review.status != ReviewStatus.REMOVED,
    )
    total = (await db.execute(count_q)).scalar() or 0

    # Average rating
    avg_q = select(func.avg(Review.rating)).where(
        Review.product_id == product_id,
        Review.status != ReviewStatus.REMOVED,
    )
    avg_rating = (await db.execute(avg_q)).scalar() or 0

    # Fetch reviews with author info
    q = (
        select(
            Review,
            User.display_name.label("author_name"),
            User.avatar_url.label("author_avatar"),
        )
        .join(User, User.id == Review.user_id)
        .where(
            Review.product_id == product_id,
            Review.status != ReviewStatus.REMOVED,
        )
        .order_by(order_clause)
        .offset(offset)
        .limit(per_page)
    )
    rows = (await db.execute(q)).all()

    items = []
    for row in rows:
        review = row[0]
        items.append({
            "id": str(review.id),
            "product_id": str(review.product_id),
            "order_id": str(review.order_id),
            "user_id": str(review.user_id),
            "rating": review.rating,
            "text": review.comment,
            "media_urls": review.media_urls,
            "content_hash": review.content_hash,
            "status": review.status,
            "is_verified": review.is_verified,
            "helpful_count": review.helpful_count,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "author_name": row.author_name,
            "author_avatar": row.author_avatar,
        })

    return {
        "items": items,
        "total": total,
        "avg_rating": round(float(avg_rating), 2),
        "page": page,
        "per_page": per_page,
        "sort_by": sort_by,
    }


@router.get("/stats/{product_id}", response_model=ReviewStats)
async def review_stats(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Aggregate review statistics for a product: average rating, count per star."""
    base_filter = and_(
        Review.product_id == product_id,
        Review.status != ReviewStatus.REMOVED,
    )

    # Total + average
    agg_q = select(
        func.count(Review.id).label("total"),
        func.coalesce(func.avg(Review.rating), 0).label("avg_rating"),
    ).where(base_filter)
    agg = (await db.execute(agg_q)).one()

    # Per-star breakdown
    star_q = select(
        Review.rating,
        func.count(Review.id).label("cnt"),
    ).where(base_filter).group_by(Review.rating)
    star_rows = (await db.execute(star_q)).all()

    star_counts = {str(i): 0 for i in range(1, 6)}
    for row in star_rows:
        star_counts[str(row.rating)] = row.cnt

    return ReviewStats(
        product_id=product_id,
        total_reviews=agg.total,
        avg_rating=round(float(agg.avg_rating), 2),
        star_counts=star_counts,
    )


@router.put("/{review_id}/flag")
async def flag_review(
    review_id: UUID,
    body: FlagRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Vendor flags a review for moderation. Only vendors can flag."""
    if current_user.role not in (UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Chỉ vendor hoặc admin mới có thể gắn cờ đánh giá")

    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Đánh giá không tồn tại")

    if review.status == ReviewStatus.REMOVED:
        raise HTTPException(400, "Đánh giá đã bị xoá")

    review.status = ReviewStatus.FLAGGED
    review.flagged_by = current_user.id
    review.flagged_reason = body.reason
    review.flagged_at = datetime.now(timezone.utc)
    db.add(review)
    await db.commit()

    return {
        "status": "flagged",
        "review_id": str(review_id),
        "reason": body.reason,
    }


@router.delete("/{review_id}")
async def remove_review(
    review_id: UUID,
    body: RemoveRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Admin removes a review with a reason. Soft-delete (status → removed)."""
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Đánh giá không tồn tại")

    if review.status == ReviewStatus.REMOVED:
        raise HTTPException(400, "Đánh giá đã bị xoá trước đó")

    review.status = ReviewStatus.REMOVED
    review.removed_by = current_user.id
    review.removed_reason = body.reason
    review.removed_at = datetime.now(timezone.utc)
    db.add(review)
    await db.commit()

    return {
        "status": "removed",
        "review_id": str(review_id),
        "reason": body.reason,
    }
