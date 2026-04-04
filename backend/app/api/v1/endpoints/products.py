"""
WellKOC — Products Endpoints
GET    /products          List + filter + search
GET    /products/:id      Product detail
POST   /products          Create (Vendor only)
PUT    /products/:id      Update (Vendor owner)
DELETE /products/:id      Archive
POST   /products/:id/dpp  Mint DPP NFT
GET    /products/search   Hybrid vector + full-text
"""
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductListResponse, ProductSearchParams,
)
from app.services.product_service import ProductService
from app.services.dpp_service import DPPService
from app.models.product import Product as ProductModel
from sqlalchemy import select, or_

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None),
    dpp_only: bool = Query(False),
    sort: str = Query("popular", enum=["popular", "newest", "price_asc", "price_desc", "rating"]),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List products with filtering and sorting"""
    svc = ProductService(db)
    return await svc.list_products(
        category=category,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        dpp_only=dpp_only,
        sort=sort,
        page=page,
        per_page=per_page,
    )


@router.get("/search", response_model=ProductListResponse)
async def search_products(
    q: str = Query(..., min_length=1, max_length=200),
    category: Optional[str] = Query(None),
    dpp_only: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    lang: str = Query("vi", enum=["vi", "en", "zh", "hi", "th"]),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search using PostgreSQL tsvector with ts_rank relevance scoring.
    Falls back to trigram similarity (pg_trgm) when full-text returns 0 results.
    Supports Vietnamese + English + multilingual queries.
    Results sorted by relevance score.
    """
    svc = ProductService(db)
    return await svc.hybrid_search(
        query=q,
        category=category,
        dpp_only=dpp_only,
        page=page,
        per_page=per_page,
        lang=lang,
    )


@router.get("/slug/{slug}", response_model=ProductResponse)
async def get_product_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get product by SKU or name slug (for human-readable URLs)."""
    # Search by SKU exact match first, then by name ILIKE
    r = await db.execute(
        select(ProductModel).where(
            or_(
                ProductModel.sku == slug,
                ProductModel.name.ilike(slug.replace("-", "%")),
            ),
            ProductModel.status == "active",
        ).limit(1)
    )
    product = r.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    return product


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get product detail with DPP metadata"""
    svc = ProductService(db)
    product = await svc.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    await svc.increment_view(product_id)
    return product


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    body: ProductCreate,
    current_user: Annotated[User, Depends(require_role([UserRole.VENDOR, UserRole.ADMIN]))],
    db: AsyncSession = Depends(get_db),
):
    """Create new product (Vendor only). Triggers DPP mint if certifications provided."""
    svc = ProductService(db)
    product = await svc.create(vendor_id=current_user.id, data=body)

    # Auto-mint DPP NFT if certifications present
    if body.certifications and body.manufacturer:
        dpp_svc = DPPService(db)
        await dpp_svc.mint_async(product_id=product.id)  # Celery task

    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update product (owner or admin)"""
    svc = ProductService(db)
    product = await svc.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    if str(product.vendor_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa")

    return await svc.update(product_id=product_id, data=body)


@router.delete("/{product_id}", status_code=204)
async def archive_product(
    product_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Archive product (soft delete)"""
    svc = ProductService(db)
    product = await svc.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    if str(product.vendor_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Không có quyền xóa")
    await svc.archive(product_id)


@router.post("/{product_id}/dpp", status_code=202)
async def mint_dpp(
    product_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger DPP NFT minting on Polygon.
    Returns job_id to poll status.
    """
    svc = ProductService(db)
    product = await svc.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    if str(product.vendor_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Không có quyền")

    dpp_svc = DPPService(db)
    job_id = await dpp_svc.mint_async(product_id=product_id)
    return {"message": "DPP minting queued", "job_id": job_id}
