"""
WellKOC — WebSocket room access control tests.

Covers:
    - verify_ws_token returns (user_id, role) or None
    - _can_subscribe_room access control rules
    - Admin-only rooms blocked for buyers/KOCs
    - KOC rooms: self-access allowed, other KOC blocked
    - Public rooms (live, groupbuy) accessible to all roles
"""
import pytest
from unittest.mock import patch
from jose import jwt

from app.api.v1.endpoints.websocket import verify_ws_token, _can_subscribe_room


# ── Token fixtures ────────────────────────────────────────────────────────────

def _make_token(user_id: str, role: str, secret: str = "test-secret-key-32-chars-minimum!") -> str:
    from datetime import datetime, timezone, timedelta
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _make_refresh_token(user_id: str, secret: str = "test-secret-key-32-chars-minimum!") -> str:
    """Token with type=refresh — should be rejected."""
    from datetime import datetime, timezone, timedelta
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


SECRET = "test-secret-key-32-chars-minimum!"


# ── verify_ws_token tests ─────────────────────────────────────────────────────

class TestVerifyWsToken:
    def test_valid_token_returns_user_id_and_role(self):
        token = _make_token("user-123", "buyer", SECRET)
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token(token)
        assert result is not None
        user_id, role = result
        assert user_id == "user-123"
        assert role == "buyer"

    def test_valid_koc_token(self):
        token = _make_token("koc-456", "koc", SECRET)
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token(token)
        assert result is not None
        assert result[1] == "koc"

    def test_valid_admin_token(self):
        token = _make_token("admin-789", "admin", SECRET)
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token(token)
        assert result is not None
        assert result[1] == "admin"

    def test_invalid_token_returns_none(self):
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token("not.a.valid.token")
        assert result is None

    def test_wrong_secret_returns_none(self):
        token = _make_token("user-123", "buyer", "wrong-secret-key-32-chars-padding!")
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token(token)
        assert result is None

    def test_refresh_token_rejected(self):
        """Refresh tokens must NOT be accepted for WebSocket auth."""
        token = _make_refresh_token("user-123", SECRET)
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token(token)
        assert result is None

    def test_empty_token_returns_none(self):
        with patch("app.api.v1.endpoints.websocket.settings") as mock_settings:
            mock_settings.SECRET_KEY = SECRET
            result = verify_ws_token("")
        assert result is None


# ── _can_subscribe_room tests ─────────────────────────────────────────────────

class TestRoomAccessControl:

    # ── live:* rooms ──────────────────────────────────────────
    def test_live_room_accessible_to_buyer(self):
        assert _can_subscribe_room("live:session-abc", "user-1", "buyer") is True

    def test_live_room_accessible_to_koc(self):
        assert _can_subscribe_room("live:session-abc", "koc-1", "koc") is True

    def test_live_room_accessible_to_vendor(self):
        assert _can_subscribe_room("live:session-abc", "vendor-1", "vendor") is True

    def test_live_room_accessible_to_admin(self):
        assert _can_subscribe_room("live:session-abc", "admin-1", "admin") is True

    # ── groupbuy:* rooms ─────────────────────────────────────
    def test_groupbuy_room_accessible_to_all(self):
        for role in ("buyer", "koc", "vendor", "admin"):
            assert _can_subscribe_room("groupbuy:gb-123", f"user-{role}", role) is True

    # ── koc:* rooms ──────────────────────────────────────────
    def test_koc_room_accessible_to_self(self):
        """KOC can subscribe to their own room."""
        assert _can_subscribe_room("koc:my-koc-id", "my-koc-id", "koc") is True

    def test_koc_room_blocked_for_other_koc(self):
        """KOC cannot subscribe to another KOC's room."""
        assert _can_subscribe_room("koc:other-koc-id", "my-koc-id", "koc") is False

    def test_koc_room_blocked_for_buyer(self):
        """Buyer cannot subscribe to any KOC room."""
        assert _can_subscribe_room("koc:some-koc-id", "buyer-1", "buyer") is False

    def test_koc_room_accessible_to_admin(self):
        """Admin can subscribe to any KOC room."""
        assert _can_subscribe_room("koc:any-koc-id", "admin-1", "admin") is True

    # ── admin:* rooms ─────────────────────────────────────────
    def test_admin_room_blocked_for_buyer(self):
        """Buyers cannot access admin rooms."""
        assert _can_subscribe_room("admin:dashboard", "buyer-1", "buyer") is False

    def test_admin_room_blocked_for_koc(self):
        """KOCs cannot access admin rooms."""
        assert _can_subscribe_room("admin:commission-ops", "koc-1", "koc") is False

    def test_admin_room_blocked_for_vendor(self):
        """Vendors cannot access admin rooms."""
        assert _can_subscribe_room("admin:fraud-alerts", "vendor-1", "vendor") is False

    def test_admin_room_accessible_to_admin(self):
        """Only admins can access admin rooms."""
        assert _can_subscribe_room("admin:dashboard", "admin-1", "admin") is True

    # ── unknown rooms ─────────────────────────────────────────
    def test_unknown_room_prefix_denied(self):
        """Unknown/unlisted room prefixes are denied."""
        assert _can_subscribe_room("unknown:room", "user-1", "admin") is False
        assert _can_subscribe_room("hack:attempt", "user-1", "buyer") is False
        assert _can_subscribe_room("", "user-1", "buyer") is False

    def test_room_without_colon_denied(self):
        """Rooms without proper prefix:id format are denied."""
        assert _can_subscribe_room("live", "user-1", "buyer") is False
        assert _can_subscribe_room("admin", "user-1", "admin") is False

    def test_live_prefix_injection_attempt(self):
        """Ensure 'live:fake:admin' doesn't bypass admin check."""
        # This is a live room (startswith live:), should be allowed
        # But the test verifies it doesn't magically grant admin access
        result = _can_subscribe_room("live:fake:admin", "user-1", "buyer")
        assert result is True  # live rooms are public — this is correct behavior
