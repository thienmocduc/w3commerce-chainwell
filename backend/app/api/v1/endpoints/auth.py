"""
WellKOC — Auth Endpoints
POST /auth/register
POST /auth/login
POST /auth/otp/send
POST /auth/otp/verify
POST /auth/wallet/connect
POST /auth/refresh
POST /auth/logout
GET  /auth/me
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    OTPSendRequest, OTPVerifyRequest,
    WalletConnectRequest, UserMeResponse,
)
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService
from app.api.v1.deps import get_current_user
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Register new user (Buyer/KOC/Vendor).
    Sends OTP for verification.
    """
    svc = AuthService(db)
    tokens, user = await svc.register(
        email=body.email,
        phone=body.phone,
        password=body.password,
        role=body.role,
        referral_code=body.referral_code,
        language=body.language or "vi",
        ip=request.client.host if request.client else None,
    )
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email/phone + password.
    Returns JWT access + refresh tokens.
    """
    svc = AuthService(db)
    tokens = await svc.login(
        identifier=body.identifier,  # email or phone
        password=body.password,
        ip=request.client.host if request.client else None,
    )
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thông tin đăng nhập không đúng",  # Wrong credentials
            headers={"WWW-Authenticate": "Bearer"},
        )
    return tokens


@router.post("/otp/send")
async def send_otp(
    body: OTPSendRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Send OTP to phone or email (rate limited: 3/10min per target + 10/10min per IP)"""
    # BUG#7 FIX: endpoint-level IP rate limit (guards against service-layer failures)
    from app.core.redis_client import get_redis
    r = await get_redis()
    ip = request.client.host if request.client else "unknown"
    ip_key = f"otp_send_ip:{ip}"
    pipe = r.pipeline()
    pipe.incr(ip_key)
    pipe.expire(ip_key, 600)
    ip_count = (await pipe.execute())[0]
    if ip_count > 10:
        raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu OTP từ địa chỉ này. Vui lòng thử lại sau")
    svc = OTPService(db)
    await svc.send(target=body.target, purpose=body.purpose, ip=ip)
    return {"message": "OTP đã được gửi", "expires_in": 300}


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    body: OTPVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verify OTP and return JWT tokens"""
    svc = OTPService(db)
    auth_svc = AuthService(db)
    user = await svc.verify(target=body.target, code=body.code, purpose=body.purpose)
    if not user:
        raise HTTPException(status_code=400, detail="OTP không hợp lệ hoặc đã hết hạn")
    tokens = await auth_svc.create_tokens(user)
    return tokens


@router.post("/wallet/connect", response_model=TokenResponse)
async def wallet_connect(
    body: WalletConnectRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Sign-in with MetaMask wallet.
    Verifies EIP-712 signature.
    """
    svc = AuthService(db)
    tokens = await svc.wallet_login(
        wallet_address=body.wallet_address,
        signature=body.signature,
        message=body.message,
        ip=request.client.host if request.client else None,
    )
    if not tokens:
        raise HTTPException(status_code=401, detail="Xác thực ví thất bại")
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Exchange refresh token for new access token (rate limited: 10/min per IP)"""
    # BUG#6 FIX: Basic token format validation
    if not refresh_token or len(refresh_token) > 2000 or " " in refresh_token:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    # BUG#5 FIX: Atomic pipeline to avoid race condition
    from app.core.redis_client import get_redis
    r = await get_redis()
    ip = request.client.host if request.client else "unknown"
    rate_key = f"refresh_rate:{ip}"
    pipe = r.pipeline()
    pipe.incr(rate_key)
    pipe.expire(rate_key, 60)
    results = await pipe.execute()
    count = results[0]
    if count > 10:
        raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu. Vui lòng thử lại sau")

    svc = AuthService(db)
    tokens = await svc.refresh(refresh_token=refresh_token)
    if not tokens:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    return tokens


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Invalidate current session"""
    svc = AuthService(db)
    await svc.logout(user_id=current_user.id)
    return {"message": "Đăng xuất thành công"}


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get current authenticated user profile"""
    return current_user


@router.get("/profile", response_model=UserMeResponse)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Alias for /me — returns current user profile."""
    return current_user


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

@router.put("/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile fields."""
    if body.display_name is not None: current_user.display_name = body.display_name
    if body.phone is not None: current_user.phone = body.phone
    if body.avatar_url is not None: current_user.avatar_url = body.avatar_url
    if body.bio is not None: current_user.bio = body.bio
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/sync")
async def sync_user(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Sync Supabase user to backend DB (called after login to ensure record exists)."""
    # User is already upserted in get_current_user — just return current state
    return {"id": str(current_user.id), "email": current_user.email, "role": current_user.role, "synced": True}


@router.post("/wallet/link")
async def link_wallet(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Link a wallet address to the user's account (alias for /wallet/connect)."""
    wallet_address = body.get("wallet_address") or body.get("address")
    if not wallet_address:
        raise HTTPException(400, "wallet_address required")
    current_user.wallet_address = wallet_address
    db.add(current_user)
    await db.commit()
    return {"status": "linked", "wallet_address": wallet_address}


@router.post("/referral/apply")
async def apply_referral(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Apply a referral code to the current user (if not already referred)."""
    code = body.get("referral_code", "").strip().upper()
    if not code:
        raise HTTPException(400, "referral_code required")
    if current_user.referred_by_id:
        raise HTTPException(400, "Tài khoản đã áp dụng mã giới thiệu")
    from sqlalchemy import select as _select
    r = await db.execute(_select(User).where(User.referral_code == code))
    referrer = r.scalar_one_or_none()
    if not referrer:
        raise HTTPException(404, "Mã giới thiệu không hợp lệ")
    if str(referrer.id) == str(current_user.id):
        raise HTTPException(400, "Không thể dùng mã giới thiệu của chính mình")
    current_user.referred_by_id = referrer.id
    db.add(current_user)
    await db.commit()
    return {"status": "applied", "referred_by": str(referrer.id)}
