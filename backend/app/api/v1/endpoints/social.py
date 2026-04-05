"""
WellKOC — Social / Follow Graph & Feed Endpoints (Module #39)
POST   /social/follow/{user_id}       Follow a KOC/user
DELETE /social/unfollow/{user_id}     Unfollow
GET    /social/followers/{user_id}    Followers list (paginated)
GET    /social/following/{user_id}    Following list (paginated)
GET    /social/feed                   Personalized feed
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, delete, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, OptionalUser, Pagination
from app.models.social import Follow
from app.models.user import User
from app.models.product import Product

router = APIRouter(prefix="/social", tags=["Social"])


# ── Schemas ──────────────────────────────────────────────────

class UserBrief(BaseModel):
    id: UUID
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    reputation_score: int = 0

    class Config:
        from_attributes = True


class FollowResponse(BaseModel):
    status: str
    follower_id: UUID
    following_id: UUID


class PaginatedFollows(BaseModel):
    items: list[UserBrief]
    total: int
    page: int
    per_page: int


# ── Follow / Unfollow ────────────────────────────────────────

@router.post("/follow/{user_id}", response_model=FollowResponse, status_code=201)
async def follow_user(
    user_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Follow a KOC or user. Cannot follow yourself."""
    if current_user.id == user_id:
        raise HTTPException(400, "Không thể tự follow chính mình")

    # Check target user exists
    target = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    if not target.scalar_one_or_none():
        raise HTTPException(404, "Người dùng không tồn tại")

    # Check if already following
    existing = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Bạn đã follow người này rồi")

    follow = Follow(follower_id=current_user.id, following_id=user_id)
    db.add(follow)
    await db.commit()

    return FollowResponse(
        status="followed",
        follower_id=current_user.id,
        following_id=user_id,
    )


@router.delete("/unfollow/{user_id}")
async def unfollow_user(
    user_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Unfollow a user."""
    result = await db.execute(
        delete(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(404, "Bạn chưa follow người này")

    await db.commit()
    return {"status": "unfollowed", "following_id": str(user_id)}


@router.get("/following/{user_id}/check")
async def check_follow_status(
    user_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Check whether the current user is following a given user."""
    existing = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    is_following = existing.scalar_one_or_none() is not None
    return {
        "following": is_following,      # matches frontend type: { following: boolean }
        "is_following": is_following,   # also keep snake_case alias for consistency
        "follower_id": str(current_user.id),
        "following_id": str(user_id),
    }


# ── Followers / Following Lists ──────────────────────────────

@router.get("/followers/{user_id}", response_model=PaginatedFollows)
async def get_followers(
    user_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated list of followers for a user."""
    offset = (page - 1) * per_page

    # Total count
    count_q = select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch followers with user info
    q = (
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == user_id, User.is_active == True)
        .order_by(desc(Follow.created_at))
        .offset(offset)
        .limit(per_page)
    )
    rows = (await db.execute(q)).scalars().all()

    items = [
        UserBrief(
            id=u.id,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            role=u.role,
            reputation_score=u.reputation_score,
        )
        for u in rows
    ]

    return PaginatedFollows(items=items, total=total, page=page, per_page=per_page)


@router.get("/following/{user_id}", response_model=PaginatedFollows)
async def get_following(
    user_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated list of users that a user follows."""
    offset = (page - 1) * per_page

    count_q = select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(User)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == user_id, User.is_active == True)
        .order_by(desc(Follow.created_at))
        .offset(offset)
        .limit(per_page)
    )
    rows = (await db.execute(q)).scalars().all()

    items = [
        UserBrief(
            id=u.id,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            role=u.role,
            reputation_score=u.reputation_score,
        )
        for u in rows
    ]

    return PaginatedFollows(items=items, total=total, page=page, per_page=per_page)


# ── Personalized Feed ────────────────────────────────────────

@router.get("/feed")
async def social_feed(
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Personalized feed combining:
    1. Recent reviews/posts from followed KOCs
    2. Trending products (high rating, recent orders)
    Returns mixed feed items sorted by recency.
    """
    from app.models.review import Review
    from app.models.order import Order

    offset = (page - 1) * per_page

    # ── 1) Reviews from followed KOCs ────────────────────────
    followed_ids_q = select(Follow.following_id).where(Follow.follower_id == current_user.id)

    reviews_q = (
        select(
            Review.id,
            Review.product_id,
            Review.rating,
            Review.comment,
            Review.images,
            Review.created_at,
            Review.user_id,
            User.display_name.label("author_name"),
            User.avatar_url.label("author_avatar"),
            Product.name.label("product_name"),
            Product.thumbnail_url.label("product_thumbnail"),
        )
        .join(User, User.id == Review.user_id)
        .join(Product, Product.id == Review.product_id)
        .where(Review.user_id.in_(followed_ids_q))
        .order_by(desc(Review.created_at))
        .offset(offset)
        .limit(per_page)
    )
    review_rows = (await db.execute(reviews_q)).all()

    feed_items = []
    for r in review_rows:
        feed_items.append({
            "type": "koc_review",
            "id": str(r.id),
            "product_id": str(r.product_id),
            "product_name": r.product_name,
            "product_thumbnail": r.product_thumbnail,
            "rating": r.rating,
            "comment": r.comment,
            "images": r.images,
            "author": {
                "id": str(r.user_id),
                "display_name": r.author_name,
                "avatar_url": r.author_avatar,
            },
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # ── 2) Trending products (fill remaining slots) ──────────
    remaining = per_page - len(feed_items)
    if remaining > 0:
        trending_q = (
            select(
                Product.id,
                Product.name,
                Product.thumbnail_url,
                Product.price,
                Product.rating_avg,
                Product.sold_count,
            )
            .where(Product.status == "active")
            .order_by(desc(Product.sold_count), desc(Product.rating_avg))
            .limit(remaining)
        )
        trending_rows = (await db.execute(trending_q)).all()

        for p in trending_rows:
            feed_items.append({
                "type": "trending_product",
                "id": str(p.id),
                "product_name": p.name,
                "product_thumbnail": p.thumbnail_url,
                "price": float(p.price) if p.price else 0,
                "rating_avg": float(p.rating_avg) if p.rating_avg else 0,
                "sold_count": p.sold_count or 0,
            })

    # ── Follow stats for current user ────────────────────────
    following_count = (await db.execute(
        select(func.count()).select_from(Follow).where(Follow.follower_id == current_user.id)
    )).scalar() or 0
    followers_count = (await db.execute(
        select(func.count()).select_from(Follow).where(Follow.following_id == current_user.id)
    )).scalar() or 0

    return {
        "items": feed_items,
        "page": page,
        "per_page": per_page,
        "following_count": following_count,
        "followers_count": followers_count,
    }
