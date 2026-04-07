"""
WellKOC — Notifications Endpoints
GET    /notifications                List notifications (paginated, filterable)
PUT    /notifications/{id}/read      Mark single notification read
PUT    /notifications/read-all       Mark all as read
GET    /notifications/unread-count   Count of unread notifications
POST   /notifications/push           Internal: push a notification to a user (server-side)
"""
import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.api.v1.deps import get_current_user, require_role
from app.models.user import User, UserRole

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# ─────────────────────────────────────────────────────────────────────────────
# Redis schema: each notification stored as JSON in a Redis List
# Key: notifs:{user_id}   Type: List (max 200 items, LPUSH + LTRIM)
# {
#   "id": "uuid",
#   "type": "order_update|commission|system|koc_alert",
#   "title": "...",
#   "body": "...",
#   "read": false,
#   "created_at": "ISO8601",
#   "data": {}  -- optional extra payload
# }
# ─────────────────────────────────────────────────────────────────────────────

MAX_NOTIFS_PER_USER = 200


async def _redis_get_all(user_id: str) -> list[dict]:
    """Fetch all notifications for a user from Redis. Returns [] if unavailable."""
    if not redis_client:
        return []
    try:
        raw = await redis_client.lrange(f"notifs:{user_id}", 0, MAX_NOTIFS_PER_USER - 1)
        return [json.loads(item) for item in raw]
    except Exception:
        return []


async def _redis_save_all(user_id: str, items: list[dict]) -> None:
    """Overwrite the notification list for a user."""
    if not redis_client:
        return
    key = f"notifs:{user_id}"
    try:
        await redis_client.delete(key)
        if items:
            await redis_client.rpush(key, *[json.dumps(n) for n in items])
    except Exception:
        pass


# ── Schemas ──────────────────────────────────────────────────────────────────

class PushNotificationRequest(BaseModel):
    user_id: UUID
    type: str = "system"
    title: str
    body: str
    data: Optional[dict] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    notif_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user (paginated)."""
    items = await _redis_get_all(str(current_user.id))
    if unread_only:
        items = [n for n in items if not n.get("read", False)]
    if notif_type:
        items = [n for n in items if n.get("type") == notif_type]
    total = len(items)
    unread = sum(1 for n in items if not n.get("read", False))
    start = (page - 1) * per_page
    return {
        "items": items[start: start + per_page],
        "total": total,
        "page": page,
        "per_page": per_page,
        "unread": unread,
    }


@router.get("/unread-count")
async def unread_count(current_user: User = Depends(get_current_user)):
    """Return count of unread notifications."""
    items = await _redis_get_all(str(current_user.id))
    return {"count": sum(1 for n in items if not n.get("read", False))}


@router.put("/read-all", status_code=200)
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read."""
    items = await _redis_get_all(str(current_user.id))
    updated = [{**n, "read": True} for n in items]
    await _redis_save_all(str(current_user.id), updated)
    return {"status": "all read", "count": len(updated)}


@router.put("/{notification_id}/read", status_code=200)
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    items = await _redis_get_all(str(current_user.id))
    found = False
    updated = []
    for n in items:
        if str(n.get("id")) == notification_id:
            n = {**n, "read": True}
            found = True
        updated.append(n)
    if found:
        await _redis_save_all(str(current_user.id), updated)
    return {"id": notification_id, "read": True, "found": found}


@router.post("/push", status_code=201)
async def push_notification(
    body: PushNotificationRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin: push a notification to a specific user."""
    from datetime import datetime, timezone
    import uuid as _uuid

    notif = {
        "id": str(_uuid.uuid4()),
        "type": body.type,
        "title": body.title,
        "body": body.body,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": body.data or {},
    }
    if not redis_client:
        raise HTTPException(503, "Notification service không khả dụng")
    key = f"notifs:{body.user_id}"
    await redis_client.lpush(key, json.dumps(notif))
    await redis_client.ltrim(key, 0, MAX_NOTIFS_PER_USER - 1)
    return {"status": "pushed", "notification_id": notif["id"]}
