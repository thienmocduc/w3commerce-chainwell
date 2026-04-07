"""
WellKOC — Live Commerce Endpoints (Module #30-31)
Live streaming, product popups, flash sales, and replays
"""
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role, Pagination
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.live_stream import (
    LiveStream, LiveStreamStatus,
    LiveFlashSale, LiveProductPopup,
)

router = APIRouter(prefix="/live", tags=["Live Commerce"])


# ── Schemas ──────────────────────────────────────────────────

class LiveStartRequest(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = Field(None, max_length=1000)
    product_ids: list[uuid.UUID] = Field(default=[], max_length=20)
    thumbnail_url: Optional[str] = None


class LiveStartResponse(BaseModel):
    id: str
    stream_key: str
    rtmp_url: str
    playback_url: str
    title: str
    status: str
    started_at: datetime


class ProductPopupRequest(BaseModel):
    product_id: uuid.UUID
    message: Optional[str] = Field(None, max_length=300)
    display_seconds: int = Field(15, ge=5, le=60)


class FlashSaleRequest(BaseModel):
    product_id: uuid.UUID
    discount_percent: float = Field(..., gt=0, le=90)
    quantity_limit: int = Field(50, ge=1, le=1000)
    duration_seconds: int = Field(300, ge=60, le=3600)


class FlashSaleOut(BaseModel):
    id: str
    product_id: str
    discount_percent: float
    flash_price: Optional[float]
    quantity_limit: int
    quantity_sold: int
    duration_seconds: int
    is_active: bool
    started_at: datetime
    ends_at: datetime

    model_config = {"from_attributes": True}


class ProductPopupOut(BaseModel):
    id: str
    product_id: str
    message: Optional[str]
    display_seconds: int
    clicked_count: int
    shown_at: datetime

    model_config = {"from_attributes": True}


class LiveStreamOut(BaseModel):
    id: str
    host_id: str
    title: str
    description: Optional[str]
    status: str
    playback_url: Optional[str]
    thumbnail_url: Optional[str]
    product_ids: list[str]
    viewer_count: int
    peak_viewers: int
    total_viewers: int
    like_count: int
    comment_count: int
    orders_count: int
    revenue_vnd: float
    started_at: datetime
    ended_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class LiveStreamDetailOut(LiveStreamOut):
    flash_sales: list[FlashSaleOut] = []
    product_popups: list[ProductPopupOut] = []
    recording_url: Optional[str] = None
    recording_duration_seconds: Optional[int] = None


class LiveReplayOut(BaseModel):
    id: str
    title: str
    recording_url: Optional[str]
    recording_duration_seconds: Optional[int]
    host_id: str
    total_viewers: int
    orders_count: int
    revenue_vnd: float
    started_at: datetime
    ended_at: Optional[datetime]


# ── Endpoints ────────────────────────────────────────────────

@router.post("/start", response_model=LiveStartResponse, status_code=status.HTTP_201_CREATED)
async def start_live_stream(
    body: LiveStartRequest,
    current_user: User = Depends(require_role([UserRole.KOC, UserRole.VENDOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """KOC starts a live commerce stream. Returns stream_key and rtmp_url."""
    # Check user doesn't already have an active stream
    existing = await db.execute(
        select(LiveStream).where(
            LiveStream.host_id == current_user.id,
            LiveStream.status == LiveStreamStatus.LIVE,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "You already have an active live stream")

    # Validate product IDs if provided
    if body.product_ids:
        result = await db.execute(
            select(Product.id).where(Product.id.in_(body.product_ids))
        )
        found_ids = {row[0] for row in result.all()}
        missing = set(body.product_ids) - found_ids
        if missing:
            raise HTTPException(404, f"Products not found: {[str(m) for m in missing]}")

    # Generate stream credentials
    stream_key = secrets.token_urlsafe(32)
    stream_id = uuid.uuid4()
    rtmp_url = f"rtmp://live.wellkoc.com/stream/{stream_key}"
    playback_url = f"https://live.wellkoc.com/watch/{stream_id}"

    live_stream = LiveStream(
        id=stream_id,
        host_id=current_user.id,
        title=body.title,
        description=body.description,
        stream_key=stream_key,
        rtmp_url=rtmp_url,
        playback_url=playback_url,
        thumbnail_url=body.thumbnail_url,
        product_ids=[str(pid) for pid in body.product_ids],
        status=LiveStreamStatus.LIVE,
    )
    db.add(live_stream)
    await db.commit()
    await db.refresh(live_stream)

    return LiveStartResponse(
        id=str(live_stream.id),
        stream_key=stream_key,
        rtmp_url=rtmp_url,
        playback_url=playback_url,
        title=live_stream.title,
        status=live_stream.status,
        started_at=live_stream.started_at,
    )


@router.get("/active", response_model=list[LiveStreamOut])
async def list_active_streams(
    pagination: Pagination,
    db: AsyncSession = Depends(get_db),
):
    """List currently active live streams"""
    result = await db.execute(
        select(LiveStream)
        .where(LiveStream.status == LiveStreamStatus.LIVE)
        .order_by(LiveStream.viewer_count.desc())
        .offset(pagination.offset)
        .limit(pagination.per_page)
    )
    streams = result.scalars().all()
    return [_build_stream_out(s) for s in streams]


@router.get("/{stream_id}", response_model=LiveStreamDetailOut)
async def get_stream_details(
    stream_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get live stream details including viewer count, products, flash sales"""
    result = await db.execute(
        select(LiveStream).where(LiveStream.id == stream_id)
    )
    stream = result.scalar_one_or_none()
    if not stream:
        raise HTTPException(404, "Live stream not found")

    return _build_stream_detail(stream)


@router.post("/{stream_id}/product-popup", response_model=ProductPopupOut, status_code=status.HTTP_201_CREATED)
async def push_product_popup(
    stream_id: uuid.UUID,
    body: ProductPopupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Push a product popup overlay to all live viewers"""
    stream = await _get_host_stream(stream_id, current_user, db)

    # Verify product exists
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    popup = LiveProductPopup(
        live_stream_id=stream_id,
        product_id=body.product_id,
        message=body.message or f"{product.name} - {product.price} {product.currency}",
        display_seconds=body.display_seconds,
    )
    db.add(popup)
    await db.commit()
    await db.refresh(popup)

    # TODO: Push via WebSocket to connected viewers

    return ProductPopupOut(
        id=str(popup.id),
        product_id=str(popup.product_id),
        message=popup.message,
        display_seconds=popup.display_seconds,
        clicked_count=popup.clicked_count,
        shown_at=popup.shown_at,
    )


@router.post("/{stream_id}/flash-sale", response_model=FlashSaleOut, status_code=status.HTTP_201_CREATED)
async def trigger_flash_sale(
    stream_id: uuid.UUID,
    body: FlashSaleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a limited-time flash sale during a live stream"""
    stream = await _get_host_stream(stream_id, current_user, db)

    # Verify product exists and get price
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    # Check no active flash sale for same product in this stream
    existing = await db.execute(
        select(LiveFlashSale).where(
            LiveFlashSale.live_stream_id == stream_id,
            LiveFlashSale.product_id == body.product_id,
            LiveFlashSale.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "A flash sale is already active for this product in this stream")

    flash_price = float(product.price) * (1 - body.discount_percent / 100)
    now = datetime.utcnow()

    flash_sale = LiveFlashSale(
        live_stream_id=stream_id,
        product_id=body.product_id,
        discount_percent=body.discount_percent,
        flash_price=round(flash_price, 2),
        quantity_limit=body.quantity_limit,
        duration_seconds=body.duration_seconds,
        started_at=now,
        ends_at=now + timedelta(seconds=body.duration_seconds),
    )
    db.add(flash_sale)
    await db.commit()
    await db.refresh(flash_sale)

    # TODO: Push flash sale event via WebSocket to connected viewers

    return FlashSaleOut(
        id=str(flash_sale.id),
        product_id=str(flash_sale.product_id),
        discount_percent=float(flash_sale.discount_percent),
        flash_price=float(flash_sale.flash_price) if flash_sale.flash_price else None,
        quantity_limit=flash_sale.quantity_limit,
        quantity_sold=flash_sale.quantity_sold,
        duration_seconds=flash_sale.duration_seconds,
        is_active=flash_sale.is_active,
        started_at=flash_sale.started_at,
        ends_at=flash_sale.ends_at,
    )


@router.put("/{stream_id}/end", response_model=LiveStreamOut)
async def end_live_stream(
    stream_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End a live stream. Deactivates all flash sales."""
    stream = await _get_host_stream(stream_id, current_user, db)

    now = datetime.utcnow()
    stream.status = LiveStreamStatus.ENDED
    stream.ended_at = now

    # Calculate recording duration
    if stream.started_at:
        stream.recording_duration_seconds = int((now - stream.started_at).total_seconds())

    # Generate replay URL
    stream.recording_url = f"https://cdn.wellkoc.com/replays/{stream_id}.mp4"

    # Deactivate all flash sales
    await db.execute(
        update(LiveFlashSale)
        .where(
            LiveFlashSale.live_stream_id == stream_id,
            LiveFlashSale.is_active == True,
        )
        .values(is_active=False)
    )

    await db.commit()
    await db.refresh(stream)

    return _build_stream_out(stream)


@router.get("/{stream_id}/replay", response_model=LiveReplayOut)
async def get_replay(
    stream_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get recording URL for a completed live stream"""
    result = await db.execute(
        select(LiveStream).where(LiveStream.id == stream_id)
    )
    stream = result.scalar_one_or_none()
    if not stream:
        raise HTTPException(404, "Live stream not found")

    if stream.status != LiveStreamStatus.ENDED:
        raise HTTPException(400, "Replay is only available after the stream has ended")

    if not stream.recording_url:
        raise HTTPException(404, "Recording not yet available — processing may still be in progress")

    return LiveReplayOut(
        id=str(stream.id),
        title=stream.title,
        recording_url=stream.recording_url,
        recording_duration_seconds=stream.recording_duration_seconds,
        host_id=str(stream.host_id),
        total_viewers=stream.total_viewers,
        orders_count=stream.orders_count,
        revenue_vnd=float(stream.revenue_vnd),
        started_at=stream.started_at,
        ended_at=stream.ended_at,
    )


# ── Helpers ──────────────────────────────────────────────────

async def _get_host_stream(
    stream_id: uuid.UUID, current_user: User, db: AsyncSession
) -> LiveStream:
    """Fetch a live stream and verify the user is the host or admin"""
    result = await db.execute(
        select(LiveStream).where(LiveStream.id == stream_id)
    )
    stream = result.scalar_one_or_none()
    if not stream:
        raise HTTPException(404, "Live stream not found")

    if stream.host_id != current_user.id and current_user.role not in (
        UserRole.ADMIN, UserRole.SUPER_ADMIN
    ):
        raise HTTPException(403, "Only the stream host or an admin can perform this action")

    if stream.status != LiveStreamStatus.LIVE:
        raise HTTPException(400, f"Stream is not live (status: {stream.status})")

    return stream


def _build_stream_out(s: LiveStream) -> LiveStreamOut:
    return LiveStreamOut(
        id=str(s.id),
        host_id=str(s.host_id),
        title=s.title,
        description=s.description,
        status=s.status,
        playback_url=s.playback_url,
        thumbnail_url=s.thumbnail_url,
        product_ids=s.product_ids or [],
        viewer_count=s.viewer_count,
        peak_viewers=s.peak_viewers,
        total_viewers=s.total_viewers,
        like_count=s.like_count,
        comment_count=s.comment_count,
        orders_count=s.orders_count,
        revenue_vnd=float(s.revenue_vnd),
        started_at=s.started_at,
        ended_at=s.ended_at,
        created_at=s.created_at,
    )


def _build_stream_detail(s: LiveStream) -> LiveStreamDetailOut:
    base = _build_stream_out(s)
    flash_sales = [
        FlashSaleOut(
            id=str(fs.id),
            product_id=str(fs.product_id),
            discount_percent=float(fs.discount_percent),
            flash_price=float(fs.flash_price) if fs.flash_price else None,
            quantity_limit=fs.quantity_limit,
            quantity_sold=fs.quantity_sold,
            duration_seconds=fs.duration_seconds,
            is_active=fs.is_active,
            started_at=fs.started_at,
            ends_at=fs.ends_at,
        )
        for fs in (s.flash_sales or [])
    ]
    popups = [
        ProductPopupOut(
            id=str(pp.id),
            product_id=str(pp.product_id),
            message=pp.message,
            display_seconds=pp.display_seconds,
            clicked_count=pp.clicked_count,
            shown_at=pp.shown_at,
        )
        for pp in (s.product_popups or [])
    ]
    return LiveStreamDetailOut(
        **base.model_dump(),
        flash_sales=flash_sales,
        product_popups=popups,
        recording_url=s.recording_url,
        recording_duration_seconds=s.recording_duration_seconds,
    )
