"""
WellKOC — FastAPI Dependencies
Reusable Depends() functions for auth, role guards, pagination.

Auth strategy:
  - Frontend uses Supabase Auth → sends Supabase JWT
  - Supabase now uses ECC (P-256) / ES256 signing keys
  - Backend fetches JWKS from Supabase and caches public keys
  - Falls back to legacy HS256 SUPABASE_JWT_SECRET if JWKS fails
  - Wallet login uses backend HS256 JWT as final fallback
"""
import time
import httpx
from functools import lru_cache
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
SUPABASE_PROJECT_ID = "gltdkplfukjfpajwftzd"
SUPABASE_JWKS_URL = f"https://{SUPABASE_PROJECT_ID}.supabase.co/auth/v1/.well-known/jwks.json"

# Simple in-memory JWKS cache (refreshed every 24h)
_jwks_cache: dict = {"keys": [], "fetched_at": 0}
_JWKS_TTL = 86400  # 24 hours


async def _get_jwks() -> list:
    """Fetch and cache Supabase JWKS public keys."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL:
        return _jwks_cache["keys"]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(SUPABASE_JWKS_URL)
            if resp.status_code == 200:
                data = resp.json()
                _jwks_cache["keys"] = data.get("keys", [])
                _jwks_cache["fetched_at"] = now
                return _jwks_cache["keys"]
    except Exception:
        pass
    return _jwks_cache["keys"]  # return stale cache on failure


async def _decode_supabase_token(token: str) -> Optional[dict]:
    """
    Validate a Supabase JWT using JWKS (ES256) or legacy HS256 secret.
    Returns payload dict or None if invalid.
    """
    # 1. Try JWKS / ES256 (new ECC keys)
    keys = await _get_jwks()
    if keys:
        # Match kid header to the right key — avoids trying all keys
        try:
            header = jwt.get_unverified_header(token)
            token_kid = header.get("kid")
        except Exception:
            token_kid = None

        # If kid matches, try only that key; otherwise try all
        candidates = [k for k in keys if k.get("kid") == token_kid] if token_kid else keys
        if not candidates:
            candidates = keys  # fallback: try all

        for key_data in candidates:
            try:
                payload = jwt.decode(
                    token,
                    key_data,
                    algorithms=["ES256", "RS256"],
                    options={"verify_aud": True},
                    audience="authenticated",
                )
                payload["_source"] = "supabase"
                return payload
            except JWTError:
                continue

        # All JWKS candidates failed — force cache refresh and retry once
        # (handles Supabase key rotation during live session)
        _jwks_cache["fetched_at"] = 0  # invalidate cache
        refreshed_keys = await _get_jwks()
        if refreshed_keys and refreshed_keys != keys:
            for key_data in refreshed_keys:
                try:
                    payload = jwt.decode(
                        token,
                        key_data,
                        algorithms=["ES256", "RS256"],
                        options={"verify_aud": True},
                        audience="authenticated",
                    )
                    payload["_source"] = "supabase"
                    return payload
                except JWTError:
                    continue

    # 2. Fall back to legacy HS256 shared secret (verify audience)
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": True},
                audience="authenticated",
            )
            payload["_source"] = "supabase"
            return payload
        except JWTError:
            pass

    return None


def _is_supabase_token(token: str) -> bool:
    """Quick check: decode header to see if issuer looks like Supabase."""
    try:
        header = jwt.get_unverified_header(token)
        claims = jwt.get_unverified_claims(token)
        iss = claims.get("iss", "")
        return "supabase" in iss or header.get("alg") in ("ES256", "RS256")
    except Exception:
        return False


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT (Supabase ES256/HS256 or backend HS256), return User."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không được cung cấp",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Try Supabase token first
    if _is_supabase_token(token):
        payload = await _decode_supabase_token(token)
        if payload:
            return await _upsert_supabase_user(payload, db)
        raise HTTPException(status_code=401, detail="Token Supabase không hợp lệ hoặc đã hết hạn")

    # Backend JWT (wallet login, etc.)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn hoặc không hợp lệ")

    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")
    if not user_id or token_type != "access":
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    # Check Redis blacklist
    from app.core.redis_client import redis_client
    if await redis_client.get(f"logout:{user_id}"):
        raise HTTPException(status_code=401, detail="Token đã bị huỷ")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc đã bị vô hiệu hoá")
    return user


async def _upsert_supabase_user(payload: dict, db: AsyncSession) -> User:
    """Auto-provision user from Supabase JWT payload into local DB."""
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token thiếu sub")
    try:
        user_id = UUID(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="sub không phải UUID hợp lệ")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        meta = payload.get("user_metadata") or {}
        app_meta = payload.get("app_metadata") or {}
        email = payload.get("email") or meta.get("email", "")
        # Only trust app_metadata for elevated roles (set server-side via Supabase admin).
        # user_metadata is user-controlled during sign-up — never grant elevated roles from it.
        role_str = app_meta.get("role") or "user"
        try:
            role = UserRole(role_str)
            # Hard guard: never auto-assign ADMIN/SUPER_ADMIN on first login
            if role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
                role = UserRole.USER
        except ValueError:
            role = UserRole.USER

        user = User(
            id=user_id,
            email=email,
            full_name=meta.get("full_name") or meta.get("name") or email.split("@")[0],
            role=role,
            is_active=True,
            phone=meta.get("phone") or "",
            referral_code=meta.get("referral_code") or f"WK-{sub[:6].upper()}",
        )
        db.add(user)
        await db.flush()

    return user


async def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user but returns None if not authenticated."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(roles: list[str]):
    """Factory: create a dependency that requires one of the given roles"""
    async def _check(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in roles and current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Yêu cầu vai trò: {', '.join(roles)}",
            )
        return current_user
    return _check


def require_kyc(kyc_status: str = "approved"):
    """Require KYC approval for sensitive actions"""
    async def _check(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.kyc_status != kyc_status and current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cần xác minh KYC để thực hiện hành động này",
            )
        return current_user
    return _check


class PaginationParams:
    """Standard pagination parameters"""
    def __init__(self, page: int = 1, per_page: int = 20):
        self.page = max(1, page)
        self.per_page = min(per_page, settings.MAX_PAGE_SIZE)
        self.offset = (self.page - 1) * self.per_page


Pagination = Annotated[PaginationParams, Depends(PaginationParams)]
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_optional_user)]
