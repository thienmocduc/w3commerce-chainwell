"""
WellKOC — Auth Service
Handles registration, login, OTP, MetaMask wallet sign-in, JWT tokens
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User, UserRole, KYCStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def _gen_referral_code(length: int = 8) -> str:
    """Legacy random code generator — kept as fallback."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def _gen_wk_referral_code(user_id: str) -> str:
    """Generate referral code as WK-{first 6 chars of user id uppercase}."""
    return f"WK-{str(user_id).replace('-', '')[:6].upper()}"


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Register ─────────────────────────────────────────────
    async def register(
        self,
        email: Optional[str],
        phone: Optional[str],
        password: str,
        role: str = UserRole.BUYER,
        referral_code: Optional[str] = None,
        language: str = "vi",
        ip: Optional[str] = None,
    ) -> tuple[dict, User]:
        # Check duplicate
        if email:
            existing = await self._find_by_email(email)
            if existing:
                raise ValueError("Email đã được sử dụng")
        if phone:
            existing = await self._find_by_phone(phone)
            if existing:
                raise ValueError("Số điện thoại đã được sử dụng")

        # Resolve referrer — look up user who owns this referral_code
        referred_by_id = None
        if referral_code:
            referrer = await self._find_by_referral(referral_code)
            if referrer:
                referred_by_id = referrer.id
            # Silently ignore invalid referral codes (don't block registration)

        # Create user with a temporary referral_code (will be replaced after flush)
        user = User(
            email=email,
            phone=phone,
            hashed_password=pwd_context.hash(password),
            role=role,
            language=language,
            referral_code=_gen_referral_code(),  # temp placeholder
            referred_by_id=referred_by_id,
            kyc_status=KYCStatus.PENDING,
            last_login_ip=ip,
        )
        self.db.add(user)
        await self.db.flush()  # Get the ID

        # Auto-generate referral_code as WK-{first 6 chars of user id}
        wk_code = _gen_wk_referral_code(str(user.id))

        # Ensure uniqueness — if collision, append random chars
        existing = await self._find_by_referral(wk_code)
        if existing and existing.id != user.id:
            wk_code = f"{wk_code}{secrets.choice(string.ascii_uppercase)}{secrets.choice(string.digits)}"

        user.referral_code = wk_code

        # Auto-create KOCProfile for KOC role
        if role == UserRole.KOC:
            from app.models.koc_profile import KOCProfile
            koc_profile = KOCProfile(user_id=user.id)
            self.db.add(koc_profile)

        tokens = await self.create_tokens(user)
        return tokens, user

    # ── Login ────────────────────────────────────────────────
    async def login(
        self,
        identifier: str,  # email or phone
        password: str,
        ip: Optional[str] = None,
    ) -> Optional[dict]:
        # Find by email or phone
        result = await self.db.execute(
            select(User).where(
                or_(User.email == identifier, User.phone == identifier)
            )
        )
        user = result.scalar_one_or_none()
        if not user:
            return None
        if not user.is_active:
            raise ValueError("Tài khoản đã bị vô hiệu hoá")
        if not pwd_context.verify(password, user.hashed_password or ""):
            return None

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        user.last_login_ip = ip
        self.db.add(user)

        return await self.create_tokens(user)

    # ── Wallet login ─────────────────────────────────────────
    async def wallet_login(
        self,
        wallet_address: str,
        signature: str,
        message: str,
        ip: Optional[str] = None,
    ) -> Optional[dict]:
        from eth_account import Account
        from eth_account.messages import encode_defunct

        # Verify EIP-191 signature
        try:
            msg = encode_defunct(text=message)
            recovered = Account.recover_message(msg, signature=signature)
            if recovered.lower() != wallet_address.lower():
                return None
        except Exception:
            return None

        # Find or create user by wallet
        result = await self.db.execute(
            select(User).where(User.wallet_address == wallet_address.lower())
        )
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                wallet_address=wallet_address.lower(),
                role=UserRole.BUYER,
                language="vi",
                referral_code=_gen_referral_code(),  # temp placeholder
                kyc_status=KYCStatus.PENDING,
                last_login_ip=ip,
            )
            self.db.add(user)
            await self.db.flush()
            # Auto-generate WK- referral code from user id
            user.referral_code = _gen_wk_referral_code(str(user.id))

        user.last_login_at = datetime.now(timezone.utc)
        user.last_login_ip = ip
        return await self.create_tokens(user)

    # ── JWT Token creation ───────────────────────────────────
    async def create_tokens(self, user: User) -> dict:
        now = datetime.now(timezone.utc)

        # Access token: short-lived (60 min)
        access_payload = {
            "sub": str(user.id),
            "role": user.role,
            "email": user.email,
            "iat": now,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            "type": "access",
        }
        access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=ALGORITHM)

        # Refresh token: long-lived (7 days)
        refresh_payload = {
            "sub": str(user.id),
            "iat": now,
            "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            "type": "refresh",
            "jti": secrets.token_hex(16),  # Unique token ID
        }
        refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=ALGORITHM)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "role": user.role,
                "email": user.email,
                "phone": user.phone,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "language": user.language,
                "kyc_status": user.kyc_status,
                "membership_tier": user.membership_tier,
                "referral_code": user.referral_code,
            },
        }

    async def refresh(self, refresh_token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                return None
            user_id = payload.get("sub")
        except JWTError:
            return None

        result = await self.db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return None

        return await self.create_tokens(user)

    async def logout(self, user_id: UUID) -> None:
        # In production: add token to Redis blacklist
        from app.core.redis_client import redis_client
        await redis_client.set(f"logout:{user_id}", "1", ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    # ── Helpers ──────────────────────────────────────────────
    async def _find_by_email(self, email: str) -> Optional[User]:
        r = await self.db.execute(select(User).where(User.email == email))
        return r.scalar_one_or_none()

    async def _find_by_phone(self, phone: str) -> Optional[User]:
        r = await self.db.execute(select(User).where(User.phone == phone))
        return r.scalar_one_or_none()

    async def _find_by_referral(self, code: str) -> Optional[User]:
        r = await self.db.execute(select(User).where(User.referral_code == code))
        return r.scalar_one_or_none()
