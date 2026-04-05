"""WellKOC — DPP NFT Endpoints"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.product import Product
from app.models.user import User, UserRole
from app.services.dpp_service import DPPService

router = APIRouter(prefix="/dpp", tags=["DPP"])
vendor_only = require_role([UserRole.VENDOR, UserRole.ADMIN])


@router.post("/mint/{product_id}")
async def mint_dpp(
    product_id: UUID,
    current_user: User = Depends(vendor_only),
    db: AsyncSession = Depends(get_db),
):
    """Trigger DPP NFT minting for a product. Returns a job tracking ID."""
    # Verify product exists and belongs to vendor
    r = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = r.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Sản phẩm không tồn tại")

    # Only allow the owning vendor (or admin)
    if (
        current_user.role != UserRole.ADMIN
        and current_user.role != UserRole.SUPER_ADMIN
        and product.vendor_id != current_user.id
    ):
        raise HTTPException(403, "Bạn không có quyền mint DPP cho sản phẩm này")

    if product.dpp_verified:
        raise HTTPException(400, "Sản phẩm đã có DPP NFT")

    svc = DPPService(db)
    job_id = await svc.mint_async(product_id)

    return {
        "job_id": job_id,
        "product_id": str(product_id),
        "status": "queued",
        "message": "DPP NFT minting đã được xếp hàng",
    }


@router.get("/verify/{token_id}")
async def verify_dpp(token_id: int, db: AsyncSession = Depends(get_db)):
    """Verify DPP authenticity. Returns real metadata from DPP record."""
    svc = DPPService(db)
    result = await svc.verify_token(token_id)
    if not result:
        raise HTTPException(404, "DPP Token không tồn tại")
    return result


@router.get("/product/{product_id}")
async def get_product_dpp(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get DPP info for a product."""
    r = await db.execute(select(Product).where(Product.id == product_id))
    product = r.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Sản phẩm không tồn tại")

    svc = DPPService(db)
    dpp_record = await svc.get_dpp_record(product_id)

    if not product.dpp_verified or not dpp_record:
        return {"dpp_verified": False, "message": "Sản phẩm chưa có DPP NFT"}

    return {
        "dpp_verified": True,
        "product_id": str(product_id),
        "product_name": product.name,
        **dpp_record,
    }


@router.post("/scan/{token_id}")
async def scan_dpp(token_id: int, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Scan a DPP NFT (awards WK tokens to the user)."""
    from app.services.gamification_service import GamificationService
    from app.models.gamification import WKEvent
    svc = GamificationService(db)
    await svc.award_wk(current_user.id, WKEvent.DPP_VERIFIED_PURCHASE, reference_id=str(token_id))
    return {"scanned": True, "wk_earned": 15, "message": "Sản phẩm chính hãng đã xác minh"}


@router.get("/product/{product_id}/scans")
async def get_product_scan_history(
    product_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get DPP scan history for a product (public — shows trust signal)."""
    from sqlalchemy import func, desc
    from app.models.gamification import WKTransaction, WKEvent

    # Scans are recorded as WKTransaction entries with event_type=DPP_VERIFIED_PURCHASE
    # and reference_id matching the product's token_id or product_id string
    base_q = select(WKTransaction).where(
        WKTransaction.event_type == WKEvent.DPP_VERIFIED_PURCHASE,
        WKTransaction.reference_id == str(product_id),
    )

    total_r = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = total_r.scalar() or 0

    q = (
        base_q
        .order_by(desc(WKTransaction.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await db.execute(q)).scalars().all()

    return {
        "product_id": str(product_id),
        "total_scans": total,
        "page": page,
        "per_page": per_page,
        "items": [
            {
                "scanned_at": tx.created_at.isoformat() if tx.created_at else None,
                "user_id": str(tx.user_id),
                "wk_earned": tx.wk_earned,
            }
            for tx in rows
        ],
    }
