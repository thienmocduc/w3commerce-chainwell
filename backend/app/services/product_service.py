"""
WellKOC — Product Service
Full-text search with PostgreSQL tsvector + trigram fuzzy fallback
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_, text, literal_column, case, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product


# Map language codes to PostgreSQL text search configurations
_PG_TS_CONFIG = {
    "vi": "simple",       # PostgreSQL has no built-in Vietnamese; 'simple' works for CJK/Vietnamese
    "en": "english",
    "zh": "simple",
    "hi": "simple",
    "th": "simple",
}

# Visible product statuses (active = approved by admin, published = vendor-set live)
_VISIBLE_STATUSES = ("active", "published")

# Frontend category key → DB category value mapping
# Frontend sends short English keys; DB may store full Vietnamese names
_CATEGORY_ALIAS: dict[str, str] = {
    "food": "Thuc Pham Chuc Nang",
    "skincare": "Skincare",
    "tech": "tech",
    "fashion": "fashion",
    "health": "health",
    "supplement": "supplement",
}


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── List products with filtering ──────────────────────────────
    async def list_products(
        self,
        category=None,
        brand=None,
        min_price=None,
        max_price=None,
        dpp_only=False,
        sort="popular",
        page=1,
        per_page=20,
    ):
        q = select(Product).where(Product.status.in_(_VISIBLE_STATUSES))
        if category:
            resolved = _CATEGORY_ALIAS.get(category.lower(), category)
            # Match both the frontend key ('food') and any legacy full name ('Thuc Pham Chuc Nang')
            candidates = list({category, resolved})
            q = q.where(Product.category.in_(candidates))
        if brand:
            q = q.where(Product.brand == brand)
        if min_price:
            q = q.where(Product.price >= min_price)
        if max_price:
            q = q.where(Product.price <= max_price)
        if dpp_only:
            q = q.where(Product.dpp_verified == True)  # noqa: E712

        sort_map = {
            "popular": Product.order_count.desc(),
            "newest": Product.created_at.desc(),
            "price_asc": Product.price.asc(),
            "price_desc": Product.price.desc(),
            "rating": Product.rating_avg.desc(),
        }
        q = q.order_by(sort_map.get(sort, Product.order_count.desc()))

        total_r = await self.db.execute(
            select(func.count()).select_from(q.subquery())
        )
        total = total_r.scalar() or 0
        q = q.offset((page - 1) * per_page).limit(per_page)
        r = await self.db.execute(q)
        items = r.scalars().all()
        return {
            "items": [self._serialize(p) for p in items],
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    # ── Full-text search (tsvector) + trigram fuzzy fallback ───────
    async def hybrid_search(
        self,
        query: str,
        category=None,
        dpp_only=False,
        page=1,
        per_page=20,
        lang="vi",
    ):
        ts_config = _PG_TS_CONFIG.get(lang, "simple")
        sanitized_query = query.strip()

        # Build the text document: name + description (coalesce to avoid NULL)
        document = func.coalesce(Product.name, "") + " " + func.coalesce(Product.description, "")

        # tsvector of the document
        ts_vector = func.to_tsvector(ts_config, document)

        # tsquery — use plainto_tsquery for safe user input handling
        ts_query = func.plainto_tsquery(ts_config, sanitized_query)

        # Relevance rank
        rank = func.ts_rank(ts_vector, ts_query).label("rank")

        # ── Full-text search query ────────────────────────────────
        fts_q = (
            select(Product, rank)
            .where(
                Product.status.in_(_VISIBLE_STATUSES),
                ts_vector.op("@@")(ts_query),
            )
        )
        if category:
            resolved = _CATEGORY_ALIAS.get(category.lower(), category)
            candidates = list({category, resolved})
            fts_q = fts_q.where(Product.category.in_(candidates))
        if dpp_only:
            fts_q = fts_q.where(Product.dpp_verified == True)  # noqa: E712

        fts_q = fts_q.order_by(rank.desc(), Product.order_count.desc())

        # Count total full-text results
        count_q = select(func.count()).select_from(fts_q.subquery())
        total = (await self.db.execute(count_q)).scalar() or 0

        if total > 0:
            # Full-text search returned results — paginate and return
            paginated = fts_q.offset((page - 1) * per_page).limit(per_page)
            rows = (await self.db.execute(paginated)).all()
            items = [self._serialize(row[0], relevance=float(row[1])) for row in rows]
            return {
                "items": items,
                "total": total,
                "page": page,
                "per_page": per_page,
            }

        # ── Trigram fuzzy fallback (when full-text returns 0) ─────
        # Requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
        similarity = func.greatest(
            func.similarity(Product.name, sanitized_query),
            func.similarity(
                func.coalesce(Product.description, ""), sanitized_query
            ),
        ).label("sim")

        fuzzy_q = (
            select(Product, similarity)
            .where(
                Product.status.in_(_VISIBLE_STATUSES),
                or_(
                    func.similarity(Product.name, sanitized_query) > 0.1,
                    func.similarity(
                        func.coalesce(Product.description, ""), sanitized_query
                    ) > 0.1,
                ),
            )
        )
        if category:
            resolved = _CATEGORY_ALIAS.get(category.lower(), category)
            candidates = list({category, resolved})
            fuzzy_q = fuzzy_q.where(Product.category.in_(candidates))
        if dpp_only:
            fuzzy_q = fuzzy_q.where(Product.dpp_verified == True)  # noqa: E712

        fuzzy_q = fuzzy_q.order_by(similarity.desc(), Product.order_count.desc())

        fuzzy_count_q = select(func.count()).select_from(fuzzy_q.subquery())
        fuzzy_total = (await self.db.execute(fuzzy_count_q)).scalar() or 0

        paginated = fuzzy_q.offset((page - 1) * per_page).limit(per_page)
        rows = (await self.db.execute(paginated)).all()
        items = [self._serialize(row[0], relevance=float(row[1])) for row in rows]

        return {
            "items": items,
            "total": fuzzy_total,
            "page": page,
            "per_page": per_page,
        }

    # ── Single product by ID ──────────────────────────────────────
    async def get_by_id(self, product_id: UUID) -> Optional[Product]:
        r = await self.db.execute(
            select(Product).where(Product.id == product_id)
        )
        return r.scalar_one_or_none()

    async def increment_view(self, product_id: UUID):
        p = await self.get_by_id(product_id)
        if p:
            p.view_count += 1
            self.db.add(p)

    async def create(self, vendor_id: UUID, data) -> Product:
        p = Product(
            vendor_id=vendor_id,
            name=data.name,
            description=data.description,
            category=data.category,
            price=data.price,
            compare_at_price=data.compare_at_price,
            stock_quantity=data.stock_quantity,
            images=data.images,
            manufacturer=data.manufacturer,
            certifications=data.certifications,
            lot_number=data.lot_number,
            sku=data.sku,
            status="active",
        )
        self.db.add(p)
        await self.db.flush()
        return p

    async def update(self, product_id: UUID, data) -> Product:
        p = await self.get_by_id(product_id)
        if not p:
            return None
        for k, v in data.model_dump(exclude_none=True).items():
            if hasattr(p, k):
                setattr(p, k, v)
        self.db.add(p)
        await self.db.flush()
        return p

    async def archive(self, product_id: UUID):
        p = await self.get_by_id(product_id)
        if p:
            p.status = "archived"
            self.db.add(p)

    def _serialize(self, p, relevance: float = None):
        data = {
            "id": str(p.id),
            "name": p.name,
            "category": p.category,
            "price": float(p.price),
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
            "stock_quantity": p.stock_quantity,
            "dpp_verified": p.dpp_verified,
            "status": p.status,
            "thumbnail_url": p.thumbnail_url,
            "rating_avg": float(p.rating_avg),
            "order_count": p.order_count,
            "available_stock": p.available_stock,
            "discount_pct": p.discount_pct,
        }
        if relevance is not None:
            data["relevance"] = round(relevance, 4)
        return data
