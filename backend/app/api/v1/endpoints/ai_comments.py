"""
WellKOC — Module #36: AI Comment Reply System
Webhook for TikTok/IG/FB comments → classify → auto-reply via Claude API
KOC review/approve/reject flow
"""
import json
from datetime import datetime
from typing import Optional
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.deps import CurrentUser, Pagination, require_role
from app.models.user import User, UserRole
from app.models.social_comment import (
    SocialComment, CommentPlatform, CommentClassification, CommentStatus,
)

router = APIRouter(prefix="/ai", tags=["AI Comments"])

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

PLATFORM_CONTEXT = """You are an AI assistant for WellKOC — Vietnam's first Web3 Social Commerce platform.
You help KOCs (Key Opinion Consumers) manage their social media comments professionally."""


# ── Schemas ──────────────────────────────────────────────────

class WebhookComment(BaseModel):
    """Platform-agnostic comment payload"""
    platform: str = Field(..., pattern="^(tiktok|instagram|facebook)$")
    post_id: str = Field(..., max_length=200)
    comment_id: str = Field(..., max_length=200)
    author_name: str = Field(..., max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)
    koc_id: UUID = Field(..., description="KOC who owns the post")
    platform_data: Optional[dict] = None


class CommentOut(BaseModel):
    id: UUID
    platform: str
    post_id: str
    comment_id: str
    author_name: str
    content: str
    sentiment: Optional[str] = None
    classification: Optional[str] = None
    auto_reply: Optional[str] = None
    custom_reply: Optional[str] = None
    status: str
    koc_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    items: list[CommentOut]
    total: int
    page: int
    per_page: int


class ApproveRequest(BaseModel):
    pass  # No body needed, just approve the auto_reply


class RejectRequest(BaseModel):
    custom_reply: str = Field(..., min_length=1, max_length=2000)


class CommentStatsResponse(BaseModel):
    total: int
    auto_replied: int  # approved
    pending: int
    rejected: int
    replied: int
    classification_breakdown: dict  # {positive: N, question: N, ...}


# ── Helpers ──────────────────────────────────────────────────

def _classify_and_reply(content: str, author_name: str, platform: str) -> dict:
    """Use Claude API to classify comment and generate reply."""
    if not client:
        # Fallback: simple keyword classification
        lower = content.lower()
        if any(w in lower for w in ["spam", "quảng cáo", "click here", "http"]):
            return {"sentiment": "negative", "classification": "spam", "auto_reply": None}
        if any(w in lower for w in ["?", "bao nhiêu", "giá", "ship", "giao"]):
            return {"sentiment": "neutral", "classification": "question", "auto_reply": f"Cảm ơn {author_name}! Em sẽ trả lời ngay ạ."}
        if any(w in lower for w in ["tệ", "kém", "hỏng", "lỗi", "hoàn", "tồi"]):
            return {"sentiment": "negative", "classification": "complaint", "auto_reply": None}
        return {"sentiment": "positive", "classification": "positive", "auto_reply": f"Cảm ơn {author_name} nhiều ạ! 🙏"}

    prompt = f"""{PLATFORM_CONTEXT}

Analyze this {platform} comment and respond in JSON format only:

Comment by "{author_name}": "{content}"

Return EXACTLY this JSON (no markdown, no explanation):
{{
  "sentiment": "positive|neutral|negative",
  "classification": "positive|question|complaint|spam",
  "auto_reply": "A friendly reply in Vietnamese (null if spam or complaint)"
}}

Rules:
- For positive comments: warm thank-you reply
- For questions: helpful, informative reply
- For complaints: set auto_reply to null (will be queued for KOC manual review)
- For spam: set auto_reply to null
- Keep replies natural, friendly, under 200 chars
- Write replies in Vietnamese
"""

    resp = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        result = json.loads(raw)
        return {
            "sentiment": result.get("sentiment", "neutral"),
            "classification": result.get("classification", "positive"),
            "auto_reply": result.get("auto_reply"),
        }
    except json.JSONDecodeError:
        return {"sentiment": "neutral", "classification": "positive", "auto_reply": None}


# ── POST /ai/comment-webhook ─────────────────────────────────

@router.post("/comment-webhook", response_model=CommentOut, status_code=201)
async def receive_comment_webhook(
    body: WebhookComment,
    db: AsyncSession = Depends(get_db),
):
    """Receive comment webhook from TikTok/IG/FB.
    Classifies the comment and auto-generates a reply for positive/question types.
    Complaints are queued for KOC manual review.
    """
    # Check for duplicate comment_id
    existing = await db.execute(
        select(SocialComment).where(SocialComment.comment_id == body.comment_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Comment đã được xử lý")

    # Classify and generate reply
    ai_result = _classify_and_reply(body.content, body.author_name, body.platform)

    # Determine initial status
    classification = ai_result["classification"]
    if classification in ("complaint", "spam"):
        status = CommentStatus.PENDING  # Queue for manual review
    elif ai_result["auto_reply"]:
        status = CommentStatus.PENDING  # Has auto-reply but needs KOC approval
    else:
        status = CommentStatus.PENDING

    comment = SocialComment(
        platform=body.platform,
        post_id=body.post_id,
        comment_id=body.comment_id,
        author_name=body.author_name,
        content=body.content,
        sentiment=ai_result["sentiment"],
        classification=classification,
        auto_reply=ai_result["auto_reply"],
        status=status,
        koc_id=body.koc_id,
        platform_data=body.platform_data,
    )
    db.add(comment)
    await db.commit()

    return comment


# ── GET /ai/comments ──────────────────────────────────────────

@router.get("/comments", response_model=CommentListResponse)
async def list_comments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    *,
    paging: Pagination,
    platform: Optional[str] = Query(None, pattern="^(tiktok|instagram|facebook)$"),
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected|replied)$"),
    classification: Optional[str] = Query(None, pattern="^(positive|question|complaint|spam)$"),
):
    """List comments with generated replies for KOC to review/approve.
    KOCs see only their own comments. Admins see all.
    """
    filters = []
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        filters.append(SocialComment.koc_id == current_user.id)
    if platform:
        filters.append(SocialComment.platform == platform)
    if status:
        filters.append(SocialComment.status == status)
    if classification:
        filters.append(SocialComment.classification == classification)

    # Count
    count_q = select(func.count(SocialComment.id)).where(*filters) if filters else select(func.count(SocialComment.id))
    total = (await db.execute(count_q)).scalar() or 0

    # Items
    q = (
        select(SocialComment)
        .where(*filters) if filters else select(SocialComment)
    )
    q = q.order_by(desc(SocialComment.created_at)).offset(paging.offset).limit(paging.per_page)
    rows = (await db.execute(q)).scalars().all()

    return CommentListResponse(
        items=rows, total=total,
        page=paging.page, per_page=paging.per_page,
    )


# ── PUT /ai/comments/{id}/approve ────────────────────────────

@router.put("/comments/{comment_id}/approve", response_model=CommentOut)
async def approve_comment_reply(
    comment_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """KOC approves the auto-generated reply."""
    result = await db.execute(
        select(SocialComment).where(SocialComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(404, "Comment không tồn tại")

    # Only the owning KOC or admin can approve
    if (
        comment.koc_id != current_user.id
        and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ):
        raise HTTPException(403, "Không có quyền thực hiện")

    if not comment.auto_reply:
        raise HTTPException(422, "Comment không có auto-reply để phê duyệt")

    if comment.status != CommentStatus.PENDING:
        raise HTTPException(422, f"Comment đang ở trạng thái '{comment.status}', không thể phê duyệt")

    comment.status = CommentStatus.APPROVED
    await db.commit()

    return comment


# ── PUT /ai/comments/{id}/reject ─────────────────────────────

@router.put("/comments/{comment_id}/reject", response_model=CommentOut)
async def reject_comment_reply(
    comment_id: UUID,
    body: RejectRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """KOC rejects auto-reply and writes a custom reply."""
    result = await db.execute(
        select(SocialComment).where(SocialComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(404, "Comment không tồn tại")

    if (
        comment.koc_id != current_user.id
        and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ):
        raise HTTPException(403, "Không có quyền thực hiện")

    if comment.status not in (CommentStatus.PENDING,):
        raise HTTPException(422, f"Comment đang ở trạng thái '{comment.status}', không thể từ chối")

    comment.status = CommentStatus.REJECTED
    comment.custom_reply = body.custom_reply
    await db.commit()

    return comment


# ── GET /ai/comments/stats ───────────────────────────────────

@router.get("/comments/stats", response_model=CommentStatsResponse)
async def get_comment_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Comment statistics: total, auto-replied, pending, rejected."""
    filters = []
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        filters.append(SocialComment.koc_id == current_user.id)

    base_where = and_(*filters) if filters else True

    # Total
    total = (await db.execute(
        select(func.count(SocialComment.id)).where(base_where)
    )).scalar() or 0

    # By status
    status_q = (
        select(SocialComment.status, func.count(SocialComment.id))
        .where(base_where)
        .group_by(SocialComment.status)
    )
    status_rows = (await db.execute(status_q)).all()
    status_map = {row[0]: row[1] for row in status_rows}

    # By classification
    class_q = (
        select(SocialComment.classification, func.count(SocialComment.id))
        .where(base_where)
        .group_by(SocialComment.classification)
    )
    class_rows = (await db.execute(class_q)).all()
    class_map = {row[0] or "unknown": row[1] for row in class_rows}

    return CommentStatsResponse(
        total=total,
        auto_replied=status_map.get(CommentStatus.APPROVED, 0),
        pending=status_map.get(CommentStatus.PENDING, 0),
        rejected=status_map.get(CommentStatus.REJECTED, 0),
        replied=status_map.get(CommentStatus.REPLIED, 0),
        classification_breakdown=class_map,
    )
