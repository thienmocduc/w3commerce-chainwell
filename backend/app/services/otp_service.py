"""WellKOC — OTP Service"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.core.redis_client import get_redis
import secrets


class OTPService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send(self, target: str, purpose: str, ip: Optional[str] = None):
        r = await get_redis()

        # BUG#10 FIX: Per-IP rate limit (guards against distributed attacks)
        if ip:
            ip_pipe = r.pipeline()
            ip_pipe.incr(f"otp_rate_ip:{ip}")
            ip_pipe.expire(f"otp_rate_ip:{ip}", 600)
            ip_results = await ip_pipe.execute()
            if ip_results[0] > 20:
                raise HTTPException(429, "Quá nhiều yêu cầu OTP từ địa chỉ này")

        # Rate limit: max 3 OTPs per 10 minutes per target+purpose (atomic pipeline)
        rate_key = f"otp_rate:{purpose}:{target}"
        pipe = r.pipeline()
        pipe.incr(rate_key)
        pipe.expire(rate_key, 600)
        count = (await pipe.execute())[0]
        if count > 3:
            raise HTTPException(429, "Quá nhiều yêu cầu OTP. Vui lòng thử lại sau 10 phút")

        code = str(secrets.randbelow(900000) + 100000)
        await r.set(f"otp:{purpose}:{target}", code, ex=300)
        # Reset failed attempts counter on new OTP send
        await r.delete(f"otp_fail:{purpose}:{target}")
        # TODO: send via Twilio or email
        return True

    async def verify(self, target: str, code: str, purpose: str):
        r = await get_redis()

        # BUG#8 FIX: Atomic fail counter check + increment via pipeline
        fail_key = f"otp_fail:{purpose}:{target}"
        stored = await r.get(f"otp:{purpose}:{target}")
        if stored != code:
            # Atomically increment and set TTL
            fail_pipe = r.pipeline()
            fail_pipe.incr(fail_key)
            fail_pipe.expire(fail_key, 600)
            fails = (await fail_pipe.execute())[0]
            if fails >= 5:
                raise HTTPException(429, "Quá nhiều lần nhập sai. Vui lòng yêu cầu OTP mới")
            return None

        # Pre-check: verify fail count before proceeding
        fails = await r.get(fail_key)
        if fails and int(fails) >= 5:
            raise HTTPException(429, "Quá nhiều lần nhập sai. Vui lòng yêu cầu OTP mới")

        # Success: clean up both keys
        await r.delete(f"otp:{purpose}:{target}")
        await r.delete(fail_key)

        from sqlalchemy import select, or_
        from app.models.user import User
        result = await self.db.execute(
            select(User).where(or_(User.email == target, User.phone == target))
        )
        return result.scalar_one_or_none()
