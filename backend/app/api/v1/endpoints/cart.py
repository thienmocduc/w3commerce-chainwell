"""
WellKOC — Cart Endpoints (Full Implementation)
"""
import json
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.api.v1.deps import CurrentUser
from app.models.product import Product

router = APIRouter(prefix="/cart", tags=["Cart"])
CART_TTL = 7 * 24 * 3600

def cart_key(uid: str) -> str: return f"cart:{uid}"

async def _get_cart(uid: str) -> list:
    r = await get_redis()
    raw = await r.get(cart_key(uid))
    return json.loads(raw) if raw else []

async def _save_cart(uid: str, items: list) -> None:
    r = await get_redis()
    await r.set(cart_key(uid), json.dumps(items), ex=CART_TTL)

class AddItemReq(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int = Field(1, ge=1, le=999)
    koc_ref_id: Optional[str] = None

class UpdateItemReq(BaseModel):
    quantity: int = Field(..., ge=0, le=999)

@router.get("")
async def get_cart(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    items = await _get_cart(str(current_user.id))
    subtotal = sum(float(i.get("price",0)) * i.get("quantity",1) for i in items)
    return {"items": items, "item_count": sum(i.get("quantity",1) for i in items), "subtotal": subtotal, "total": subtotal}

@router.post("/items", status_code=201)
async def add_to_cart(body: AddItemReq, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Product).where(Product.id == body.product_id, Product.status == "active"))
    product = r.scalar_one_or_none()
    if not product: raise HTTPException(404, "Sản phẩm không tồn tại")
    if product.available_stock < body.quantity: raise HTTPException(400, f"Chỉ còn {product.available_stock} sản phẩm")
    items = await _get_cart(str(current_user.id))
    existing = next((i for i in items if i["product_id"] == str(body.product_id)), None)
    if existing:
        existing["quantity"] = min(existing["quantity"] + body.quantity, product.available_stock)
    else:
        items.append({"product_id": str(body.product_id), "variant_id": str(body.variant_id) if body.variant_id else None, "name": product.name, "thumbnail": product.thumbnail_url, "price": float(product.price), "quantity": body.quantity, "dpp_verified": product.dpp_verified, "koc_ref_id": body.koc_ref_id})
    await _save_cart(str(current_user.id), items)
    return {"status": "added", "item_count": len(items)}

@router.patch("/items/{product_id}")
async def update_item(product_id: UUID, body: UpdateItemReq, current_user: CurrentUser):
    items = await _get_cart(str(current_user.id))
    if body.quantity == 0:
        items = [i for i in items if i["product_id"] != str(product_id)]
    else:
        item = next((i for i in items if i["product_id"] == str(product_id)), None)
        if item: item["quantity"] = body.quantity
    await _save_cart(str(current_user.id), items)
    return {"status": "updated"}

@router.delete("/items/{product_id}", status_code=204)
async def remove_item(product_id: UUID, current_user: CurrentUser):
    items = [i for i in await _get_cart(str(current_user.id)) if i["product_id"] != str(product_id)]
    await _save_cart(str(current_user.id), items)

@router.delete("", status_code=204)
async def clear_cart(current_user: CurrentUser):
    r = await get_redis(); await r.delete(cart_key(str(current_user.id)))

# ── PUT alias for frontend compatibility (frontend uses PUT, backend had PATCH) ──
@router.put("/items/{product_id}")
async def update_item_put(product_id: UUID, body: UpdateItemReq, current_user: CurrentUser):
    """Alias of PATCH /items/{product_id} — frontend sends PUT"""
    return await update_item(product_id, body, current_user)

# ── Coupon endpoints ─────────────────────────────────────────────────────────────
class CouponReq(BaseModel):
    code: str

@router.post("/coupon")
async def apply_coupon(body: CouponReq, current_user: CurrentUser):
    """Apply a coupon/voucher code to the cart (stub — real validation in orders)."""
    code = body.code.strip().upper()
    # Basic validation: non-empty code accepted optimistically;
    # actual discount is computed at order creation.
    if not code:
        raise HTTPException(400, "Mã giảm giá không hợp lệ")
    r = await get_redis()
    await r.set(f"cart_coupon:{current_user.id}", code, ex=CART_TTL)
    return {"status": "applied", "code": code, "message": f"Áp dụng mã '{code}' thành công"}

@router.delete("/coupon", status_code=204)
async def remove_coupon(current_user: CurrentUser):
    """Remove applied coupon from the cart."""
    r = await get_redis()
    await r.delete(f"cart_coupon:{current_user.id}")

@router.post("/copy/{koc_id}")
async def copy_koc_cart(koc_id: str, current_user: CurrentUser):
    koc_items = await _get_cart(f"koc_recommend:{koc_id}")
    if not koc_items: raise HTTPException(404, "KOC chưa có giỏ hàng")
    user_items = await _get_cart(str(current_user.id))
    merged = {i["product_id"]: i for i in user_items}
    copied = sum(1 for ki in koc_items if ki["product_id"] not in merged and merged.update({ki["product_id"]: {**ki, "koc_ref_id": koc_id}}) is None)
    await _save_cart(str(current_user.id), list(merged.values()))
    return {"status": "copied", "items_added": copied}
