"""WellKOC — Vendor Onboarding Endpoints"""
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.user import User, UserRole
from app.models.vendor import VendorProfile

router = APIRouter(prefix="/vendor/onboard", tags=["Vendor Onboarding"])
admin_only = require_role([UserRole.ADMIN])


# ── Schemas ──────────────────────────────────────────────────

class VendorOnboardRequest(BaseModel):
    business_name: str = Field(..., max_length=300)
    tax_code: str = Field(..., max_length=20)
    business_license_url: str
    bank_account: str = Field(..., max_length=50)
    bank_name: str = Field(..., max_length=200)
    address: str = Field(..., max_length=500)
    phone: str = Field(..., max_length=20)
    product_categories: List[str] = Field(default_factory=list)
    dpp_certifications: List[str] = Field(default_factory=list)


class VendorReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    reason: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────

@router.post("")
async def vendor_onboard(
    payload: VendorOnboardRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Multi-step vendor registration. Creates vendor profile with pending_review status."""
    # Check if user already has a vendor profile
    existing = await db.execute(
        select(VendorProfile).where(VendorProfile.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Bạn đã gửi đơn đăng ký vendor rồi")

    # Create vendor profile with pending_review status
    profile = VendorProfile(
        user_id=current_user.id,
        company_name=payload.business_name,
        tax_code=payload.tax_code,
        business_license=payload.business_license_url,
        categories=payload.product_categories,
        shipping_from=payload.address,
        is_dpp_enabled=len(payload.dpp_certifications) > 0,
        membership_tier="pending_review",
    )

    # Store all business documents in a JSONB-compatible structure
    # We store extra onboarding data that doesn't have dedicated columns
    # directly on the profile using the categories field pattern
    profile.categories = payload.product_categories

    db.add(profile)
    await db.flush()  # Ensure profile.id is generated before we use it

    # Store extended onboarding data in user's profile
    # (bank info, certifications, etc. stored alongside the vendor profile)
    from app.core.redis_client import redis_client
    import json
    onboarding_data = {
        "bank_account": payload.bank_account,
        "bank_name": payload.bank_name,
        "address": payload.address,
        "phone": payload.phone,
        "dpp_certifications": payload.dpp_certifications,
        "business_license_url": payload.business_license_url,
        "status": "pending_review",
    }
    await redis_client.set(
        f"vendor_onboard:{current_user.id}",
        json.dumps(onboarding_data),
        ex=60 * 60 * 24 * 90,  # 90 days TTL
    )

    await db.commit()
    return {
        "vendor_id": str(profile.id),
        "status": "pending_review",
        "message": "Đơn đăng ký vendor đã được gửi, chờ duyệt",
    }


@router.get("/status")
async def vendor_onboard_status(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Check onboarding status for current user."""
    result = await db.execute(
        select(VendorProfile).where(VendorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return {"status": "not_started", "message": "Chưa gửi đơn đăng ký vendor"}

    # Load extended data from Redis
    from app.core.redis_client import redis_client
    import json
    raw = await redis_client.get(f"vendor_onboard:{current_user.id}")
    extra = json.loads(raw) if raw else {}

    return {
        "vendor_id": str(profile.id),
        "status": profile.membership_tier,  # pending_review / starter (approved) / rejected
        "business_name": profile.company_name,
        "tax_code": profile.tax_code,
        "categories": profile.categories,
        "is_dpp_enabled": profile.is_dpp_enabled,
        "dpp_certifications": extra.get("dpp_certifications", []),
        "created_at": profile.created_at.isoformat(),
    }


@router.put("/{vendor_id}/review")
async def review_vendor_application(
    vendor_id: UUID,
    payload: VendorReviewRequest,
    current_user: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Admin reviews vendor application. Approve or reject with reason."""
    result = await db.execute(
        select(VendorProfile).where(VendorProfile.id == vendor_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Không tìm thấy đơn đăng ký vendor")

    if profile.membership_tier not in ("pending_review",):
        raise HTTPException(400, "Đơn này đã được xử lý rồi")

    if payload.action == "approve":
        # Update vendor profile to approved
        profile.membership_tier = "starter"

        # Set user role to VENDOR
        user_result = await db.execute(
            select(User).where(User.id == profile.user_id)
        )
        user = user_result.scalar_one_or_none()
        if user:
            user.role = UserRole.VENDOR
            db.add(user)

        # Update Redis onboarding data
        from app.core.redis_client import redis_client
        import json
        raw = await redis_client.get(f"vendor_onboard:{profile.user_id}")
        if raw:
            data = json.loads(raw)
            data["status"] = "approved"
            data["reviewed_by"] = str(current_user.id)
            await redis_client.set(
                f"vendor_onboard:{profile.user_id}",
                json.dumps(data),
                ex=60 * 60 * 24 * 90,
            )

        # Send welcome notification via Celery
        try:
            from app.workers.gamification_worker import award_web3_wk
            award_web3_wk.apply_async(
                args=[str(profile.user_id), "vendor_approved"],
                queue="notifications",
            )
        except Exception:
            pass  # Non-critical: notification failure should not block approval

        db.add(profile)
        await db.commit()

        return {
            "vendor_id": str(vendor_id),
            "status": "approved",
            "message": "Vendor đã được duyệt thành công",
        }

    else:  # reject
        profile.membership_tier = "rejected"
        db.add(profile)

        # Update Redis
        from app.core.redis_client import redis_client
        import json
        raw = await redis_client.get(f"vendor_onboard:{profile.user_id}")
        if raw:
            data = json.loads(raw)
            data["status"] = "rejected"
            data["reject_reason"] = payload.reason
            data["reviewed_by"] = str(current_user.id)
            await redis_client.set(
                f"vendor_onboard:{profile.user_id}",
                json.dumps(data),
                ex=60 * 60 * 24 * 90,
            )

        await db.commit()

        return {
            "vendor_id": str(vendor_id),
            "status": "rejected",
            "reason": payload.reason,
            "message": "Đơn đăng ký vendor đã bị từ chối",
        }
