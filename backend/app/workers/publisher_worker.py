"""
WellKOC — Multi-Platform Publisher Worker (Module #25)
Celery task that handles actual publishing to each platform.
Each platform adapter formats content appropriately and simulates API call (mock).
"""
import asyncio
import hashlib
import logging
import time
from datetime import datetime, timezone
from uuid import UUID

from celery import shared_task

logger = logging.getLogger(__name__)


# ── Platform Adapters ────────────────────────────────────────

class BasePlatformAdapter:
    """Base adapter for platform publishing."""
    platform: str = "base"

    def format_content(self, content: str, hashtags: list, media_urls: list,
                       affiliate_link: str | None) -> dict:
        raise NotImplementedError

    def publish(self, formatted: dict) -> dict:
        """Mock publish — returns simulated platform_post_id and metrics."""
        post_id = f"{self.platform}_{hashlib.md5(str(time.time()).encode()).hexdigest()[:12]}"
        return {
            "platform_post_id": post_id,
            "url": f"https://{self.platform}.com/p/{post_id}",
        }


class TikTokAdapter(BasePlatformAdapter):
    """TikTok: short video description + hashtags"""
    platform = "tiktok"

    def format_content(self, content: str, hashtags: list, media_urls: list,
                       affiliate_link: str | None) -> dict:
        # TikTok limits description to ~2200 chars
        desc = content[:2000]
        tag_str = " ".join(f"#{t.strip('#')}" for t in hashtags)
        if affiliate_link:
            desc = f"{desc}\n\n🔗 {affiliate_link}"
        desc = f"{desc}\n\n{tag_str}".strip()
        return {
            "description": desc,
            "video_url": media_urls[0] if media_urls else None,
            "privacy_level": "PUBLIC_TO_EVERYONE",
        }


class InstagramAdapter(BasePlatformAdapter):
    """Instagram: image carousel with caption"""
    platform = "instagram"

    def format_content(self, content: str, hashtags: list, media_urls: list,
                       affiliate_link: str | None) -> dict:
        caption = content[:2200]  # IG caption limit
        tag_str = " ".join(f"#{t.strip('#')}" for t in hashtags[:30])  # IG max 30 hashtags
        if affiliate_link:
            caption = f"{caption}\n\n🛒 Link in bio"
        caption = f"{caption}\n\n{tag_str}".strip()
        return {
            "caption": caption,
            "media_type": "CAROUSEL" if len(media_urls) > 1 else "IMAGE",
            "media_urls": media_urls,
            "link_in_bio": affiliate_link,
        }


class FacebookAdapter(BasePlatformAdapter):
    """Facebook: standard page/profile post"""
    platform = "facebook"

    def format_content(self, content: str, hashtags: list, media_urls: list,
                       affiliate_link: str | None) -> dict:
        message = content
        tag_str = " ".join(f"#{t.strip('#')}" for t in hashtags)
        if tag_str:
            message = f"{message}\n\n{tag_str}"
        if affiliate_link:
            message = f"{message}\n\n👉 {affiliate_link}"
        return {
            "message": message,
            "link": affiliate_link,
            "media_urls": media_urls,
        }


class YouTubeAdapter(BasePlatformAdapter):
    """YouTube: community post or video description"""
    platform = "youtube"

    def format_content(self, content: str, hashtags: list, media_urls: list,
                       affiliate_link: str | None) -> dict:
        text = content
        tag_str = " ".join(f"#{t.strip('#')}" for t in hashtags[:15])
        if affiliate_link:
            text = f"{text}\n\n🛒 Mua ngay: {affiliate_link}"
        text = f"{text}\n\n{tag_str}".strip()
        has_video = any(
            url.endswith((".mp4", ".mov", ".avi", ".mkv"))
            for url in media_urls
        ) if media_urls else False
        return {
            "type": "video_description" if has_video else "community_post",
            "text": text,
            "media_urls": media_urls,
        }


class TelegramAdapter(BasePlatformAdapter):
    """Telegram: channel message with optional media"""
    platform = "telegram"

    def format_content(self, content: str, hashtags: list, media_urls: list,
                       affiliate_link: str | None) -> dict:
        message = content
        tag_str = " ".join(f"#{t.strip('#')}" for t in hashtags)
        if tag_str:
            message = f"{message}\n\n{tag_str}"
        if affiliate_link:
            message = f"{message}\n\n🔗 {affiliate_link}"
        return {
            "chat_id": None,  # Filled from PlatformConnection
            "text": message,
            "parse_mode": "HTML",
            "photo_urls": [u for u in media_urls if u.endswith((".jpg", ".png", ".webp"))],
            "video_urls": [u for u in media_urls if u.endswith((".mp4", ".mov"))],
        }


ADAPTERS = {
    "tiktok": TikTokAdapter(),
    "instagram": InstagramAdapter(),
    "facebook": FacebookAdapter(),
    "youtube": YouTubeAdapter(),
    "telegram": TelegramAdapter(),
}


# ── Celery Task ──────────────────────────────────────────────

@shared_task(
    name="app.workers.publisher_worker.publish_to_platform",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="publisher",
)
def publish_to_platform(self, job_id: str) -> dict:
    """
    Publish content to a single platform.
    Called once per PublishJob (one per platform per multi-publish request).
    """
    async def _publish():
        from app.core.database import async_session
        from app.models.publish_job import PublishJob, PublishStatus

        async with async_session() as db:
            # Load the job
            from sqlalchemy import select
            result = await db.execute(
                select(PublishJob).where(PublishJob.id == UUID(job_id))
            )
            job = result.scalar_one_or_none()
            if not job:
                logger.error(f"PublishJob {job_id} not found")
                return {"error": "Job not found"}

            if job.status == PublishStatus.CANCELLED:
                logger.info(f"PublishJob {job_id} was cancelled, skipping")
                return {"status": "cancelled"}

            # Mark as publishing — commit immediately so other workers see the lock
            job.status = PublishStatus.PUBLISHING
            db.add(job)
            await db.commit()

            try:
                # Get adapter for this platform
                adapter = ADAPTERS.get(job.platform)
                if not adapter:
                    raise ValueError(f"No adapter for platform: {job.platform}")

                # Format content
                formatted = adapter.format_content(
                    content=job.content,
                    hashtags=job.hashtags or [],
                    media_urls=job.media_urls or [],
                    affiliate_link=job.affiliate_link,
                )

                logger.info(
                    f"Publishing to {job.platform} for user {job.user_id}: "
                    f"{formatted}"
                )

                # Mock API call (simulate network delay)
                # In production, replace with actual platform API calls
                publish_result = adapter.publish(formatted)

                # Update job as published
                job.status = PublishStatus.PUBLISHED
                job.platform_post_id = publish_result["platform_post_id"]
                job.published_at = datetime.now(timezone.utc)
                job.metrics = {"views": 0, "likes": 0, "comments": 0, "shares": 0}
                db.add(job)
                await db.commit()

                logger.info(
                    f"Published to {job.platform}: post_id={publish_result['platform_post_id']}"
                )
                return {
                    "status": "published",
                    "platform": job.platform,
                    "platform_post_id": publish_result["platform_post_id"],
                }

            except Exception as exc:
                job.status = PublishStatus.FAILED
                job.error_message = str(exc)[:500]
                db.add(job)
                await db.commit()
                logger.error(f"Failed to publish {job_id} to {job.platform}: {exc}")
                raise

    try:
        return asyncio.run(_publish())
    except Exception as exc:
        logger.error(f"Publisher worker error for job {job_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
