"""
WellKOC — FastAPI Dependencies
Reusable Depends() functions for auth, role guards, pagination.

Auth strategy:
  - Frontend uses Supabase Auth → sends Supabase JWT (iss: supabase)
  - Backend validates Supabase JWT using SUPABASE_JWT_SECRET
  - User is upserted into local DB on first request (auto-provision)
  - Wallet login still returns backend JWT (python-jose) as fallback
"""
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
SUPABASE_ALGORITHM = "HS256"


def _decode_token(token: str) -> dict:
    """
    Try decoding as Supabase JWT first, then fall back to backend JWT.
    Returns the decoded payload dict.
    Raises JWTError if both fail.
    """
    # Supabase JWTs have iss = "https://<project>.supabase.co/auth/v1"
    # Try Supabase secret first if configured
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[SUPABASE_ALGORITHM],
                options={"verify_aud": False},  # Supabase sets aud="authenticated"
            )
            payload["_source"] = "supabase"
            return payload
        except JWTError:
            pass  # Fall through to backend JWT

    # Backend JWT (wallet login, etc.)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    payload["_source"] = "backend"
    return payload


async def _upsert_supabase_user(payload: dict, db: AsyncSession) -> User:
    """
    Auto-provision user from Supabase JWT payload into local DB.
    Supabase sub = user UUID, email in payload.
    """
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
        # Auto-create user from Supabase token
        meta = payload.get("user_metadata") or {}
        app_meta = payload.get("app_metadata") or {}
        email = payload.get("email") or meta.get("email", "")
        role_str = meta.get("role") or app_meta.get("role") or "user"
        try:
            role = UserRole(role_str)
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


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT (Supabase or backend), return current User."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không được cung cấp",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = _decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn hoặc không hợp lệ")

    source = payload.get("_source")

    if source == "supabase":
        user = await _upsert_supabase_user(payload, db)
        return user

    # Backend JWT path (wallet login)
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
