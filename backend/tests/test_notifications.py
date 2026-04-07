"""
WellKOC — Notifications endpoint tests.

Covers:
    GET  /api/v1/notifications
    GET  /api/v1/notifications/unread-count
    PUT  /api/v1/notifications/read-all
    PUT  /api/v1/notifications/{id}/read
    POST /api/v1/notifications/push  (admin only)
"""
import json
import uuid
import pytest
from httpx import AsyncClient
from datetime import datetime, timezone

BASE = "/api/v1/notifications"


def _make_notif(title: str, body: str = "body", read: bool = False, notif_type: str = "system") -> dict:
    return {
        "id": str(uuid.uuid4()),
        "type": notif_type,
        "title": title,
        "body": body,
        "read": read,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": {},
    }


async def _seed_notifications(fake_redis, user_id: str, notifications: list[dict]):
    """Helper: push notifications into fake Redis for a user."""
    key = f"notifs:{user_id}"
    fake_redis._store[key] = [json.dumps(n) for n in notifications]


class TestNotifications:
    @pytest.mark.asyncio
    async def test_list_returns_empty_when_no_notifications(
        self, client: AsyncClient, buyer_user
    ):
        """Empty list returned when user has no notifications."""
        from tests.conftest import _make_user
        from app.services.auth_service import AuthService

        # Login to get token
        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        assert resp.status_code == 200
        token = resp.json()["access_token"]

        resp = await client.get(BASE, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []
        assert data["unread"] == 0

    @pytest.mark.asyncio
    async def test_unread_count_zero_with_no_notifications(
        self, client: AsyncClient, buyer_user
    ):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        token = resp.json()["access_token"]

        resp = await client.get(f"{BASE}/unread-count", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    @pytest.mark.asyncio
    async def test_list_with_seeded_notifications(
        self, client: AsyncClient, buyer_user
    ):
        """Notifications seeded in Redis are returned correctly."""
        import app.core.redis_client as _rc
        fake_redis = _rc.redis_client

        notifs = [
            _make_notif("Order shipped", read=False),
            _make_notif("Commission paid", read=True, notif_type="commission"),
            _make_notif("System update", read=False, notif_type="system"),
        ]
        key = f"notifs:{buyer_user.id}"
        fake_redis._store[key] = [json.dumps(n) for n in notifs]

        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        token = resp.json()["access_token"]

        resp = await client.get(BASE, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert data["unread"] == 2  # 2 unread

    @pytest.mark.asyncio
    async def test_unread_only_filter(self, client: AsyncClient, buyer_user):
        """unread_only=true filters to only unread notifications."""
        import app.core.redis_client as _rc
        fake_redis = _rc.redis_client

        notifs = [
            _make_notif("Unread 1", read=False),
            _make_notif("Read 1", read=True),
            _make_notif("Unread 2", read=False),
        ]
        fake_redis._store[f"notifs:{buyer_user.id}"] = [json.dumps(n) for n in notifs]

        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        token = resp.json()["access_token"]

        resp = await client.get(f"{BASE}?unread_only=true", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert all(not n["read"] for n in data["items"])

    @pytest.mark.asyncio
    async def test_mark_all_read(self, client: AsyncClient, buyer_user):
        """PUT /read-all marks all notifications as read."""
        import app.core.redis_client as _rc
        fake_redis = _rc.redis_client

        notifs = [_make_notif(f"Notif {i}", read=False) for i in range(5)]
        fake_redis._store[f"notifs:{buyer_user.id}"] = [json.dumps(n) for n in notifs]

        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        token = resp.json()["access_token"]

        resp = await client.put(f"{BASE}/read-all", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["count"] == 5

        # Verify unread count is now 0
        resp = await client.get(f"{BASE}/unread-count", headers={"Authorization": f"Bearer {token}"})
        assert resp.json()["count"] == 0

    @pytest.mark.asyncio
    async def test_mark_single_read(self, client: AsyncClient, buyer_user):
        """PUT /{id}/read marks a single notification as read."""
        import app.core.redis_client as _rc
        fake_redis = _rc.redis_client

        notif_id = str(uuid.uuid4())
        notif = {"id": notif_id, "type": "system", "title": "Test", "body": "body", "read": False,
                 "created_at": datetime.now(timezone.utc).isoformat(), "data": {}}
        fake_redis._store[f"notifs:{buyer_user.id}"] = [json.dumps(notif)]

        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        token = resp.json()["access_token"]

        resp = await client.put(f"{BASE}/{notif_id}/read", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["read"] is True
        assert resp.json()["found"] is True

    @pytest.mark.asyncio
    async def test_push_requires_admin(self, client: AsyncClient, buyer_user, koc_user):
        """POST /push is admin-only — buyer/KOC get 403."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com", "password": "password123"
        })
        token = resp.json()["access_token"]

        resp = await client.post(
            f"{BASE}/push",
            json={"user_id": str(buyer_user.id), "title": "Test", "body": "body"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(self, client: AsyncClient):
        """Endpoints require authentication."""
        resp = await client.get(BASE)
        assert resp.status_code == 401

        resp = await client.get(f"{BASE}/unread-count")
        assert resp.status_code == 401

        resp = await client.put(f"{BASE}/read-all")
        assert resp.status_code == 401
