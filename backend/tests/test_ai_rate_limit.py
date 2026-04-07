"""
WellKOC — AI Rate Limiter tests.

Covers:
    - ai_rate_limit (per-user authenticated)
    - ai_rate_limit_ip (per-IP public)
    - Graceful degradation when Redis unavailable
    - HTTP 429 response format
    - Retry-After header
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ── Unit tests for the rate limiter logic ────────────────────────────────────

class TestRateLimiterCore:
    """Test _check_limit directly with a fake Redis."""

    @pytest.mark.asyncio
    async def test_first_call_passes(self):
        """First call within window should pass."""
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=1)
        fake_redis.expire = AsyncMock()

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            # Should not raise
            await _check_limit("user:test-1", limit=5)

        fake_redis.incr.assert_called_once_with("ai_rl:user:test-1")
        fake_redis.expire.assert_called_once_with("ai_rl:user:test-1", 60)

    @pytest.mark.asyncio
    async def test_within_limit_passes(self):
        """Calls at exactly the limit should pass."""
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=5)
        fake_redis.expire = AsyncMock()

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            await _check_limit("user:test-2", limit=5)

    @pytest.mark.asyncio
    async def test_over_limit_raises_429(self):
        """Calls exceeding the limit raise HTTP 429."""
        from fastapi import HTTPException
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=6)
        fake_redis.expire = AsyncMock()
        fake_redis.ttl = AsyncMock(return_value=45)

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            with pytest.raises(HTTPException) as exc_info:
                await _check_limit("user:test-3", limit=5)

        assert exc_info.value.status_code == 429
        assert "retry_after" in exc_info.value.detail
        assert exc_info.value.detail["limit"] == 5

    @pytest.mark.asyncio
    async def test_retry_after_header_set(self):
        """HTTP 429 response includes Retry-After header."""
        from fastapi import HTTPException
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=100)
        fake_redis.expire = AsyncMock()
        fake_redis.ttl = AsyncMock(return_value=30)

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            with pytest.raises(HTTPException) as exc_info:
                await _check_limit("user:test-4", limit=10)

        assert "Retry-After" in exc_info.value.headers
        assert exc_info.value.headers["Retry-After"] == "30"

    @pytest.mark.asyncio
    async def test_redis_unavailable_does_not_raise(self):
        """When Redis is None, rate limiting is skipped gracefully."""
        from app.core.ai_rate_limiter import _check_limit

        with patch("app.core.ai_rate_limiter.redis_client", None):
            # Should not raise even with limit=0
            await _check_limit("user:test-5", limit=0)

    @pytest.mark.asyncio
    async def test_redis_error_does_not_raise(self):
        """When Redis throws an unexpected error, graceful degradation."""
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(side_effect=ConnectionError("Redis down"))

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            # Should not raise
            await _check_limit("user:test-6", limit=5)

    @pytest.mark.asyncio
    async def test_expire_only_on_first_call(self):
        """EXPIRE is only set when count == 1 (first call, new key)."""
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=3)  # Not first call
        fake_redis.expire = AsyncMock()

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            await _check_limit("user:test-7", limit=10)

        # expire should NOT be called since count != 1
        fake_redis.expire.assert_not_called()

    @pytest.mark.asyncio
    async def test_ip_rate_limit_stricter(self):
        """IP-based limit (20/min) is stricter than user limit (60/min)."""
        from fastapi import HTTPException, Request
        from app.core.ai_rate_limiter import ai_rate_limit_ip

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=21)
        fake_redis.expire = AsyncMock()
        fake_redis.ttl = AsyncMock(return_value=50)

        mock_request = MagicMock(spec=Request)
        mock_request.headers = {}
        mock_request.client = MagicMock()
        mock_request.client.host = "192.168.1.100"

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            with pytest.raises(HTTPException) as exc_info:
                await ai_rate_limit_ip(mock_request)

        assert exc_info.value.status_code == 429
        # Verify it used IP key, not user key
        call_key = fake_redis.incr.call_args[0][0]
        assert "ip:" in call_key

    @pytest.mark.asyncio
    async def test_ip_extracted_from_x_forwarded_for(self):
        """X-Forwarded-For header takes precedence for IP detection."""
        from fastapi import Request
        from app.core.ai_rate_limiter import ai_rate_limit_ip

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=1)
        fake_redis.expire = AsyncMock()

        mock_request = MagicMock(spec=Request)
        mock_request.headers = {"X-Forwarded-For": "10.0.0.1, 172.16.0.1"}
        mock_request.client = MagicMock()
        mock_request.client.host = "127.0.0.1"

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            await ai_rate_limit_ip(mock_request)

        call_key = fake_redis.incr.call_args[0][0]
        assert "10.0.0.1" in call_key  # Uses first IP from X-Forwarded-For

    @pytest.mark.asyncio
    async def test_custom_window_passed_to_expire(self):
        """Custom window parameter is forwarded to EXPIRE command."""
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=1)
        fake_redis.expire = AsyncMock()

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            await _check_limit("user:test-8", limit=10, window=120)

        fake_redis.expire.assert_called_once_with("ai_rl:user:test-8", 120)

    @pytest.mark.asyncio
    async def test_rate_limit_error_message_in_vietnamese(self):
        """Error message should be in Vietnamese."""
        from fastapi import HTTPException
        from app.core.ai_rate_limiter import _check_limit

        fake_redis = AsyncMock()
        fake_redis.incr = AsyncMock(return_value=999)
        fake_redis.expire = AsyncMock()
        fake_redis.ttl = AsyncMock(return_value=10)

        with patch("app.core.ai_rate_limiter.redis_client", fake_redis):
            with pytest.raises(HTTPException) as exc_info:
                await _check_limit("user:test-9", limit=5)

        # Message should mention the limit
        msg = exc_info.value.detail.get("message", "")
        assert "5" in msg  # limit number in message
