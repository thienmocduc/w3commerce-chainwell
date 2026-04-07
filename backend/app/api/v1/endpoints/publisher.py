"""
WellKOC — Multi-Platform Auto Publisher Endpoints (Module #25)
Publish content to TikTok, Instagram, Facebook, YouTube, Telegram simultaneously.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.publish_job import (
    PublishJob, PlatformConnection,
    Platform, PublishStatus,
)
from app.models.user import UserRole

router = APIRouter(prefix="/publish", tags=["Publisher"])


# ── Schemas ──────────────────────────────────────────────────

class MultiPublishReq(BaseModel):
    platforms: list[str] = Field(..., min_length=1, description="tiktok/instagram/facebook/youtube/telegram")
    content: str = Field(..., min_length=1, max_length=5000)
    media_urls: list[str] = Field(default_factory=list)
    hashtags: list[str] = Field(default_factory=list)
    schedule_at: Optional[datetime] = None
    product_id: Optional[UUID] = None


class ResolveAlertReq(BaseModel):
    resolution: str  # confirm_fraud / false_positive


# ── Helpers ──────────────────────────────────────────────────

VALID_PLATFORMS = {p.value for p in Platform}

OAUTH_URLS = {
    "tiktok": "https://www.tiktok.com/v2/auth/authorize/?client_key={client_key}&scope=user.info.basic,video.publish&response_type=code&redirect_uri={redirect_uri}",
    "instagram": "https://api.instagram.com/oauth/authorize?client_id={client_key}&redirect_uri={redirect_uri}&scope=user_profile,user_media&response_type=code",
    "facebook": "https://www.facebook.com/v18.0/dialog/oauth?client_id={client_key}&redirect_uri={redirect_uri}&scope=pages_manage_posts,pages_read_engagement",
    "youtube": "https://accounts.google.com/o/oauth2/v2/auth?client_id={client_key}&redirect_uri={redirect_uri}&scope=https://www.googleapis.com/auth/youtube&response_type=code&access_type=offline",
    "telegram": "https://oauth.telegram.org/auth?bot_id={client_key}&origin={redirect_uri}&request_access=write",
}


def _job_dict(job: PublishJob) -> dict:
    return {
        "id": str(job.id),
        "platform": job.platform,
        "content": job.content,
        "media_urls": job.media_urls,
        "hashtags": job.hashtags,
        "product_id": str(job.product_id) if job.product_id else None,
        "affiliate_link": job.affiliate_link,
        "schedule_at": job.schedule_at.isoformat() if job.schedule_at else None,
        "published_at": job.published_at.isoformat() if job.published_at else None,
        "status": job.status,
        "platform_post_id": job.platform_post_id,
        "error_message": job.error_message,
        "metrics": job.metrics,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


def _connection_dict(conn: PlatformConnection) -> dict:
    return {
        "id": str(conn.id),
        "platform": conn.platform,
        "platform_user_id": conn.platform_user_id,
        "platform_username": conn.platform_username,
        "connected_at": conn.connected_at.isoformat() if conn.connected_at else None,
        "expires_at": conn.expires_at.isoformat() if conn.expires_at else None,
        "is_active": conn.is_active,
    }


def _generate_affiliate_link(product_id: UUID, user_id: UUID) -> str:
    """Generate affiliate link for product+KOC pair"""
    return f"https://wellkoc.vn/p/{product_id}?ref={user_id}"


# ── Endpoints ────────────────────────────────────────────────

@router.post("/multi", status_code=201)
async def publish_multi(
    body: MultiPublishReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Publish content to multiple platforms simultaneously.
    Creates one PublishJob per platform and dispatches each to Celery.
    """
    # Validate platforms
    invalid = [p for p in body.platforms if p not in VALID_PLATFORMS]
    if invalid:
        raise HTTPException(400, f"Nền tảng không hợp lệ: {', '.join(invalid)}")

    # Check platform connections
    result = await db.execute(
        select(PlatformConnection).where(
            PlatformConnection.user_id == current_user.id,
            PlatformConnection.platform.in_(body.platforms),
            PlatformConnection.is_active == True,
        )
    )
    connected = {conn.platform for conn in result.scalars().all()}
    not_connected = [p for p in body.platforms if p not in connected]
    if not_connected:
        raise HTTPException(
            400,
            f"Chưa kết nối nền tảng: {', '.join(not_connected)}. "
            "Vui lòng kết nối trước khi đăng bài.",
        )

    # Generate affiliate link if product_id provided
    affiliate_link = None
    if body.product_id:
        affiliate_link = _generate_affiliate_link(body.product_id, current_user.id)

    # Create one PublishJob per platform
    jobs = []
    for platform in body.platforms:
        job = PublishJob(
            user_id=current_user.id,
            platform=platform,
            content=body.content,
            media_urls=body.media_urls,
            hashtags=body.hashtags,
            product_id=body.product_id,
            affiliate_link=affiliate_link,
            schedule_at=body.schedule_at,
            status=PublishStatus.QUEUED,
        )
        db.add(job)
        jobs.append(job)

    await db.commit()

    # Dispatch to Celery workers
    from app.workers.publisher_worker import publish_to_platform

    for job in jobs:
        eta = body.schedule_at if body.schedule_at else None
        publish_to_platform.apply_async(
            args=[str(job.id)],
            eta=eta,
            queue="publisher",
        )

    return {
        "message": f"Đã tạo {len(jobs)} lệnh đăng bài",
        "jobs": [_job_dict(j) for j in jobs],
    }


@router.get("/jobs")
async def list_publish_jobs(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    *,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List publish jobs for current user with optional filters."""
    q = select(PublishJob).where(PublishJob.user_id == current_user.id)
    if status:
        q = q.where(PublishJob.status == status)
    if platform:
        q = q.where(PublishJob.platform == platform)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page).order_by(PublishJob.created_at.desc())
    result = await db.execute(q)
    jobs = result.scalars().all()

    return {"items": [_job_dict(j) for j in jobs], "total": total, "page": page}


@router.get("/jobs/{job_id}")
async def get_publish_job(
    job_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get detail of a publish job."""
    result = await db.execute(select(PublishJob).where(PublishJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Lệnh đăng bài không tồn tại")
    if str(job.user_id) != str(current_user.id) and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Không có quyền xem lệnh đăng bài này")
    return _job_dict(job)


@router.put("/jobs/{job_id}/cancel")
async def cancel_publish_job(
    job_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a scheduled (queued) publish job."""
    result = await db.execute(select(PublishJob).where(PublishJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Lệnh đăng bài không tồn tại")
    if str(job.user_id) != str(current_user.id):
        raise HTTPException(403, "Không có quyền huỷ lệnh đăng bài này")
    if job.status not in (PublishStatus.QUEUED,):
        raise HTTPException(400, f"Không thể huỷ lệnh ở trạng thái '{job.status}'")

    job.status = PublishStatus.CANCELLED
    db.add(job)
    await db.commit()

    return {"message": "Đã huỷ lệnh đăng bài", "job": _job_dict(job)}


@router.get("/platforms")
async def list_connected_platforms(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all platforms with OAuth connection status for current user."""
    result = await db.execute(
        select(PlatformConnection).where(
            PlatformConnection.user_id == current_user.id,
        )
    )
    connections = result.scalars().all()
    conn_map = {c.platform: c for c in connections}

    platforms = []
    for p in Platform:
        conn = conn_map.get(p.value)
        platforms.append({
            "platform": p.value,
            "connected": conn is not None and conn.is_active,
            "details": _connection_dict(conn) if conn else None,
        })

    return {"platforms": platforms}


@router.post("/platforms/{platform}/connect")
async def connect_platform(
    platform: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Initiate OAuth flow for a platform. Returns redirect URL."""
    if platform not in VALID_PLATFORMS:
        raise HTTPException(400, f"Nền tảng không hợp lệ: {platform}")

    from app.core.config import settings

    # Build OAuth redirect URL
    client_key_map = {
        "tiktok": getattr(settings, "TIKTOK_CLIENT_KEY", "tiktok_client_key"),
        "instagram": getattr(settings, "INSTAGRAM_CLIENT_ID", "instagram_client_id"),
        "facebook": getattr(settings, "FACEBOOK_APP_ID", "facebook_app_id"),
        "youtube": getattr(settings, "GOOGLE_CLIENT_ID", "google_client_id"),
        "telegram": getattr(settings, "TELEGRAM_BOT_ID", "telegram_bot_id"),
    }

    base_redirect = getattr(settings, "OAUTH_REDIRECT_BASE", "https://wellkoc.vn/oauth/callback")
    redirect_uri = f"{base_redirect}/{platform}"
    client_key = client_key_map.get(platform, "")

    oauth_url = OAUTH_URLS[platform].format(
        client_key=client_key,
        redirect_uri=redirect_uri,
    )

    # Upsert a pending connection record
    result = await db.execute(
        select(PlatformConnection).where(
            PlatformConnection.user_id == current_user.id,
            PlatformConnection.platform == platform,
        )
    )
    existing = result.scalar_one_or_none()
    if not existing:
        conn = PlatformConnection(
            user_id=current_user.id,
            platform=platform,
            is_active=False,
        )
        db.add(conn)
        await db.commit()

    return {"platform": platform, "oauth_url": oauth_url}


@router.get("/analytics")
async def publish_analytics(
    days: int = Query(30, ge=1, le=365),
    *,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Cross-platform publishing performance for current user."""
    from datetime import timedelta

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total jobs per platform
    result = await db.execute(
        select(
            PublishJob.platform,
            func.count(PublishJob.id).label("total"),
            func.count(PublishJob.id).filter(PublishJob.status == PublishStatus.PUBLISHED).label("published"),
            func.count(PublishJob.id).filter(PublishJob.status == PublishStatus.FAILED).label("failed"),
        )
        .where(
            PublishJob.user_id == current_user.id,
            PublishJob.created_at >= since,
        )
        .group_by(PublishJob.platform)
    )
    rows = result.all()

    platforms_stats = []
    for row in rows:
        # Aggregate metrics for published jobs on this platform
        metrics_r = await db.execute(
            select(PublishJob.metrics).where(
                PublishJob.user_id == current_user.id,
                PublishJob.platform == row.platform,
                PublishJob.status == PublishStatus.PUBLISHED,
                PublishJob.created_at >= since,
            )
        )
        metrics_rows = metrics_r.scalars().all()
        total_views = sum((m or {}).get("views", 0) for m in metrics_rows)
        total_likes = sum((m or {}).get("likes", 0) for m in metrics_rows)
        total_comments = sum((m or {}).get("comments", 0) for m in metrics_rows)
        total_shares = sum((m or {}).get("shares", 0) for m in metrics_rows)

        platforms_stats.append({
            "platform": row.platform,
            "total_jobs": row.total,
            "published": row.published,
            "failed": row.failed,
            "metrics": {
                "views": total_views,
                "likes": total_likes,
                "comments": total_comments,
                "shares": total_shares,
            },
        })

    return {
        "period_days": days,
        "platforms": platforms_stats,
    }
