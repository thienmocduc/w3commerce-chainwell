"""
WellKOC — 111 AI Agents Endpoint
Agent A01: Caption, A03: Hashtag, A07: Calendar, A09: Publisher, A20: Coach
All powered by Claude claude-sonnet-4-6 API
"""
import json
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role, CurrentUser
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order
from app.models.coaching_report import CoachingReport

router = APIRouter(prefix="/ai", tags=["AI Agents"])

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

PLATFORM_CONTEXT = """
You are an AI agent for WellKOC — Vietnam's first Web3 Social Commerce platform.
WellKOC connects Buyers, KOC/KOL influencers, and Vendors with on-chain commission (T1: 40%, T2: 13%) settled automatically on Polygon blockchain.
All products have DPP (Digital Product Passport) NFTs for authenticity verification.
111 AI Agents power the platform 24/7.
"""


# ── Agent A01: Caption Generator ─────────────────────────────
class CaptionRequest(BaseModel):
    product_id: Optional[UUID] = Field(None, description="Auto-fetch product details by ID")
    product_name: Optional[str] = Field(None, max_length=200)
    product_desc: Optional[str] = Field(None, max_length=500)
    platform: str = Field("tiktok", pattern="^(tiktok|instagram|facebook|youtube|telegram)$")
    tone: str = Field("enthusiastic", pattern="^(enthusiastic|professional|casual|fun|educational|urgent)$")
    language: str = Field("vi", pattern="^(vi|en|zh|hi|th)$")
    kpi_goal: Optional[str] = Field(None, pattern="^(awareness|conversion|engagement|traffic)$")
    dpp_verified: bool = False
    affiliate_link: Optional[str] = None
    include_affiliate_placeholder: bool = Field(
        True, description="Auto-inject {{AFFILIATE_LINK}} placeholder if no link provided"
    )


@router.post("/caption")
async def generate_caption(
    body: CaptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent A01: Generate platform-optimized KOC caption with DPP context.
    Supports product_id auto-fetch, DPP verification angle, and affiliate link placeholder.
    """
    if not client:
        raise HTTPException(503, "AI service unavailable - missing API key")

    product_name = body.product_name
    product_desc = body.product_desc
    dpp_verified = body.dpp_verified
    dpp_info = ""

    # Auto-fetch product details if product_id is provided
    if body.product_id:
        result = await db.execute(select(Product).where(Product.id == body.product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(404, "Product not found")
        product_name = product_name or product.name
        product_desc = product_desc or (product.description or "")[:500]
        dpp_verified = product.dpp_verified
        if product.dpp_verified:
            dpp_info = (
                f"\n- DPP NFT Token ID: #{product.dpp_nft_token_id or 'N/A'}"
                f"\n- Origin: {product.origin_country or 'Vietnam'}"
                f"\n- Manufacturer: {product.manufacturer or 'N/A'}"
                f"\n- Certifications: {', '.join(product.certifications) if product.certifications else 'N/A'}"
            )

    if not product_name:
        raise HTTPException(422, "Either product_id or product_name is required")

    # Determine affiliate link text
    affiliate_text = ""
    if body.affiliate_link:
        affiliate_text = f"6. Place affiliate link naturally: {body.affiliate_link}"
    elif body.include_affiliate_placeholder:
        affiliate_text = "6. Include affiliate link placeholder: {{AFFILIATE_LINK}} — place it naturally in CTA"

    lang_names = {"vi": "Vietnamese", "en": "English", "zh": "Chinese", "hi": "Hindi", "th": "Thai"}
    platform_tips = {
        "tiktok": "Start with a strong hook in first 3 seconds. Use trending sounds context. Max 150 words.",
        "instagram": "Visual-first copy. Use line breaks. Max 200 words.",
        "facebook": "Conversational, longer format OK. Include social proof.",
        "youtube": "SEO-optimized description. Include chapters hint.",
        "telegram": "Direct, markdown-formatted. Include CTA button text.",
    }

    kpi_strategies = {
        "awareness": "Focus on brand story, unique selling points, and shareability. Use broad hashtags.",
        "engagement": "Ask questions, use polls/quizzes context, encourage comments and shares.",
        "conversion": "Emphasize urgency, social proof, pricing, and direct CTA to purchase.",
        "traffic": "Tease content, use curiosity gap, link prominently in bio/description.",
    }

    prompt = f"""{PLATFORM_CONTEXT}

You are Agent A01 — KOC Content Specialist.

Generate a {body.platform.upper()} caption for:
- Product: {product_name}
- Description: {product_desc or 'N/A'}
- Tone: {body.tone}
- Language: {lang_names.get(body.language, 'Vietnamese')}
- KPI Goal: {body.kpi_goal or 'conversion'}
- KPI Strategy: {kpi_strategies.get(body.kpi_goal or 'conversion', '')}
- DPP Verified: {'YES - emphasize blockchain-verified authenticity and DPP passport' if dpp_verified else 'No'}{dpp_info}

Platform guidelines: {platform_tips.get(body.platform, '')}

Include:
1. Strong opening hook
2. Product benefits (3-5 points)
3. {'DPP Verification angle - mention blockchain-verified authenticity, Digital Product Passport NFT, scan-to-verify' if dpp_verified else 'Social proof mention'}
4. Clear CTA
5. Relevant hashtags (10-15){'  — include #DPPVerified #BlockchainAuthentic' if dpp_verified else ''}
{affiliate_text}

Write ONLY the caption, no explanation."""

    async def stream_caption():
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream_caption(), media_type="text/plain")


# ── Agent A03: Hashtag Generator ─────────────────────────────
class HashtagRequest(BaseModel):
    topic: str = Field(..., max_length=200)
    platform: str = Field("tiktok", pattern="^(tiktok|instagram|facebook|youtube|telegram)$")
    niche: Optional[str] = Field(None)
    language: str = Field("vi", pattern="^(vi|en|zh|hi|th)$")
    count: int = Field(30, ge=5, le=50)


class HashtagResponse(BaseModel):
    viral: list[str] = Field(description="High-reach hashtags (1M+ posts)")
    mid_tier: list[str] = Field(description="Mid-reach hashtags (100K-1M posts)")
    niche: list[str] = Field(description="Niche hashtags (<100K posts)")
    all_hashtags: list[str]
    total: int


@router.post("/hashtags", response_model=HashtagResponse)
async def generate_hashtags(body: HashtagRequest, current_user: User = Depends(get_current_user)):
    """Agent A03: Generate trending hashtags grouped by reach (viral 30%, mid 50%, niche 20%)"""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    viral_count = max(1, round(body.count * 0.30))
    mid_count = max(1, round(body.count * 0.50))
    niche_count = max(1, body.count - viral_count - mid_count)

    lang_names = {"vi": "Vietnamese", "en": "English", "zh": "Chinese", "hi": "Hindi", "th": "Thai"}

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A03 — Hashtag & Trend Specialist.

Generate exactly {body.count} hashtags for:
- Topic: {body.topic}
- Platform: {body.platform}
- Niche: {body.niche or 'general wellness/skincare'}
- Language market: {lang_names.get(body.language, 'Vietnamese')}

Return them in EXACTLY this format (no other text):
VIRAL: {viral_count} hashtags with 1M+ posts (high reach, trending)
MID: {mid_count} hashtags with 100K-1M posts (moderate reach, relevant)
NICHE: {niche_count} hashtags with <100K posts (targeted, specific community)

Mix Vietnamese and English hashtags for VN market.
Always include WellKOC branded: #WellKOC #DPPVerified #OnChainCommerce (count these in the totals).

Format:
VIRAL: #tag1 #tag2 ...
MID: #tag3 #tag4 ...
NICHE: #tag5 #tag6 ..."""

    resp = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = resp.content[0].text.strip()

    # Parse grouped hashtags
    viral_tags, mid_tags, niche_tags = [], [], []
    current_group = None
    for line in raw.split("\n"):
        line = line.strip()
        upper = line.upper()
        if upper.startswith("VIRAL"):
            current_group = "viral"
            line = line.split(":", 1)[-1] if ":" in line else ""
        elif upper.startswith("MID"):
            current_group = "mid"
            line = line.split(":", 1)[-1] if ":" in line else ""
        elif upper.startswith("NICHE"):
            current_group = "niche"
            line = line.split(":", 1)[-1] if ":" in line else ""

        tags = [t.strip() for t in line.split() if t.startswith("#")]
        if current_group == "viral":
            viral_tags.extend(tags)
        elif current_group == "mid":
            mid_tags.extend(tags)
        elif current_group == "niche":
            niche_tags.extend(tags)

    all_tags = viral_tags + mid_tags + niche_tags
    return HashtagResponse(
        viral=viral_tags,
        mid_tier=mid_tags,
        niche=niche_tags,
        all_hashtags=all_tags[:body.count],
        total=len(all_tags),
    )


# ── Agent A07: Content Calendar Generator ────────────────────
class ContentCalendarRequest(BaseModel):
    koc_id: UUID = Field(..., description="KOC user ID")
    platform: str = Field("tiktok", pattern="^(tiktok|instagram|facebook|youtube|telegram)$")
    product_ids: list[UUID] = Field(..., min_length=1, max_length=10, description="Products to promote")
    weeks: int = Field(4, ge=1, le=8, description="Number of weeks to plan")


class ContentDayPlan(BaseModel):
    day: str
    time: str
    content_type: str
    topic: str
    product_name: Optional[str] = None
    caption_hook: str
    hashtag_hint: str
    kpi_focus: str


class ContentWeekPlan(BaseModel):
    week_number: int
    theme: str
    days: list[ContentDayPlan]


class ContentCalendarResponse(BaseModel):
    koc_id: str
    platform: str
    weeks: list[ContentWeekPlan]
    summary: str


@router.post("/content-calendar", response_model=ContentCalendarResponse)
async def generate_content_calendar(
    body: ContentCalendarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent A07: Generate a multi-week content plan with topics, posting times, and content types"""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    # Fetch product details
    result = await db.execute(
        select(Product).where(Product.id.in_(body.product_ids))
    )
    products = result.scalars().all()
    if not products:
        raise HTTPException(404, "No products found for the given IDs")

    product_info = "\n".join(
        f"  - {p.name} (category: {p.category}, price: {p.price} {p.currency}, "
        f"DPP: {'Yes' if p.dpp_verified else 'No'}, rating: {p.rating_avg})"
        for p in products
    )

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A07 — Content Calendar Strategist.

Create a {body.weeks}-week content calendar for a KOC on {body.platform.upper()}.

Products to promote:
{product_info}

Return a JSON object (no markdown, no explanation) with this exact structure:
{{
  "summary": "Brief 1-2 sentence overall strategy",
  "weeks": [
    {{
      "week_number": 1,
      "theme": "Week theme name",
      "days": [
        {{
          "day": "Monday",
          "time": "19:00",
          "content_type": "short_video|carousel|story|live|reel|post",
          "topic": "Content topic description",
          "product_name": "Product name or null",
          "caption_hook": "Opening hook line",
          "hashtag_hint": "3-5 key hashtags",
          "kpi_focus": "awareness|engagement|conversion"
        }}
      ]
    }}
  ]
}}

Rules:
- 3-5 posts per week, varied content types
- Mix product promotion (60%) with lifestyle/educational content (40%)
- Optimal posting times for Vietnamese {body.platform} audience
- Rotate products across weeks
- Include at least one DPP/authenticity-focused post per week if products are DPP verified
- Each week should have a cohesive theme
- Balance KPI focus across awareness, engagement, and conversion

Return ONLY valid JSON."""

    resp = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    raw_text = resp.content[0].text.strip()
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        calendar_data = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI returned invalid calendar format — please retry")

    return ContentCalendarResponse(
        koc_id=str(body.koc_id),
        platform=body.platform,
        weeks=[
            ContentWeekPlan(
                week_number=w.get("week_number", i + 1),
                theme=w.get("theme", f"Week {i + 1}"),
                days=[
                    ContentDayPlan(**d)
                    for d in w.get("days", [])
                ],
            )
            for i, w in enumerate(calendar_data.get("weeks", []))
        ],
        summary=calendar_data.get("summary", ""),
    )


# ── Agent A07-Link: Smart Link Generator ─────────────────────
class LinkRequest(BaseModel):
    product_id: str
    koc_id: str
    platform: str = "tiktok"
    campaign_name: Optional[str] = None


@router.post("/link")
async def generate_affiliate_link(body: LinkRequest, current_user: User = Depends(get_current_user)):
    """Generate smart affiliate link with UTM tracking"""
    import hashlib
    # Short code: first 8 chars of hash
    raw = f"{body.koc_id}-{body.product_id}-{body.platform}"
    short = hashlib.sha256(raw.encode()).hexdigest()[:8].upper()

    utm_params = f"utm_source={body.platform}&utm_medium=koc&utm_campaign={body.campaign_name or 'organic'}&ref={body.koc_id[:8]}"
    short_url = f"https://wkc.io/{short}"
    full_url = f"https://wellkoc.com/products/{body.product_id}?{utm_params}"

    return {
        "short_url": short_url,
        "full_url": full_url,
        "short_code": short,
        "tracking": {
            "platform": body.platform,
            "koc_id": body.koc_id,
            "campaign": body.campaign_name or "organic",
        }
    }


# ── Coaching Schemas ──────────────────────────────────────────

class CoachingReportOut(BaseModel):
    id: UUID
    koc_id: UUID
    week_number: int
    year: int
    metrics_snapshot: dict
    recommendations: dict
    action_items: list
    peer_rank: Optional[int] = None
    improvement_score: float = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CoachingReportListResponse(BaseModel):
    items: list[CoachingReportOut]
    total: int


class BatchCoachingRequest(BaseModel):
    pass  # Admin triggers for all active KOCs


class BatchCoachingResponse(BaseModel):
    triggered: int
    koc_ids: list[str]


# ── Coaching Helpers ─────────────────────────────────────────

async def _fetch_koc_metrics(
    koc_id: UUID, db: AsyncSession, weeks_back: int = 1
) -> dict:
    """Fetch real KOC metrics from orders for the given period."""
    now = datetime.utcnow()
    period_start = now - timedelta(weeks=weeks_back)

    # Current period orders where koc is T1
    orders_q = (
        select(
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total), 0).label("gmv"),
            func.coalesce(func.avg(Order.total), 0).label("avg_order_value"),
        )
        .where(
            Order.koc_t1_id == koc_id,
            Order.created_at >= period_start,
            Order.status.notin_(["cancelled", "refunded"]),
        )
    )
    result = (await db.execute(orders_q)).one()

    # View count (from products the KOC promotes via vendor_id)
    view_q = (
        select(func.coalesce(func.sum(Product.view_count), 0))
        .where(Product.vendor_id == koc_id)
    )
    total_views = (await db.execute(view_q)).scalar() or 0

    total_orders = result.total_orders or 0
    gmv = float(result.gmv or 0)
    avg_order = float(result.avg_order_value or 0)
    cvr = round((total_orders / max(total_views, 1)) * 100, 2)

    # Top product
    top_product_q = (
        select(Product.name, Product.order_count)
        .where(Product.vendor_id == koc_id, Product.status == "active")
        .order_by(desc(Product.order_count))
        .limit(1)
    )
    top_row = (await db.execute(top_product_q)).first()
    top_product = top_row[0] if top_row else "N/A"

    return {
        "total_orders": total_orders,
        "gmv_vnd": gmv,
        "avg_order_value": avg_order,
        "cvr": cvr,
        "total_views": total_views,
        "top_product": top_product,
    }


async def _fetch_4week_avg(koc_id: UUID, db: AsyncSession) -> dict:
    """Fetch 4-week average metrics for comparison."""
    return await _fetch_koc_metrics(koc_id, db, weeks_back=4)


async def _fetch_peer_benchmark(db: AsyncSession) -> dict:
    """Anonymized top 10% KOC performance benchmark."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Get top KOCs by order count
    peer_q = (
        select(
            func.coalesce(func.avg(func.count(Order.id)), 0).label("avg_orders"),
        )
        .where(
            Order.koc_t1_id.isnot(None),
            Order.created_at >= thirty_days_ago,
            Order.status.notin_(["cancelled", "refunded"]),
        )
        .group_by(Order.koc_t1_id)
        .order_by(desc(func.count(Order.id)))
    )

    # Simplified: get top KOC stats
    top_koc_q = (
        select(
            Order.koc_t1_id,
            func.count(Order.id).label("order_count"),
            func.sum(Order.total).label("gmv"),
        )
        .where(
            Order.koc_t1_id.isnot(None),
            Order.created_at >= thirty_days_ago,
            Order.status.notin_(["cancelled", "refunded"]),
        )
        .group_by(Order.koc_t1_id)
        .order_by(desc(func.count(Order.id)))
        .limit(10)
    )
    top_rows = (await db.execute(top_koc_q)).all()

    if not top_rows:
        return {"top10_avg_orders": 0, "top10_avg_gmv": 0, "total_kocs_ranked": 0}

    avg_orders = sum(r.order_count for r in top_rows) / len(top_rows)
    avg_gmv = sum(float(r.gmv or 0) for r in top_rows) / len(top_rows)

    return {
        "top10_avg_orders": round(avg_orders, 1),
        "top10_avg_gmv": round(avg_gmv, 0),
        "total_kocs_ranked": len(top_rows),
    }


async def _get_trending_in_niche(koc_id: UUID, db: AsyncSession) -> list[str]:
    """Get trending products in the KOC's niche (based on their product categories)."""
    # Find KOC's main categories
    cat_q = (
        select(Product.category)
        .where(Product.vendor_id == koc_id)
        .group_by(Product.category)
        .order_by(desc(func.count(Product.id)))
        .limit(3)
    )
    categories = (await db.execute(cat_q)).scalars().all()

    if not categories:
        categories = []

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    trending_q = (
        select(Product.name, Product.order_count)
        .where(
            Product.status == "active",
            Product.updated_at >= seven_days_ago,
            Product.category.in_(categories) if categories else True,
        )
        .order_by(desc(Product.order_count))
        .limit(5)
    )
    rows = (await db.execute(trending_q)).all()
    return [f"{r[0]} ({r[1]} orders)" for r in rows]


# ── Agent A20: KOC Performance Coach (Enhanced) ──────────────

@router.post("/coaching/{koc_id}")
async def koc_coaching_report(
    koc_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Agent A20: Enhanced weekly AI-powered performance coaching.
    Includes weekly comparison, peer benchmarking, action items with ROI,
    and trending product suggestions for the KOC's niche.
    """
    if not client:
        raise HTTPException(503, "AI service unavailable - missing API key")

    # Verify KOC exists
    koc_result = await db.execute(select(User).where(User.id == koc_id))
    koc = koc_result.scalar_one_or_none()
    if not koc:
        raise HTTPException(404, "KOC không tồn tại")

    # Fetch real metrics
    current_metrics = await _fetch_koc_metrics(koc_id, db, weeks_back=1)
    four_week_avg = await _fetch_4week_avg(koc_id, db)
    peer_benchmark = await _fetch_peer_benchmark(db)
    trending_products = await _get_trending_in_niche(koc_id, db)

    # Calculate improvement score
    prev_orders = four_week_avg.get("total_orders", 0) / 4 if four_week_avg.get("total_orders") else 0
    curr_orders = current_metrics.get("total_orders", 0)
    improvement = round(
        ((curr_orders - prev_orders) / max(prev_orders, 1)) * 100, 2
    )

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A20 — KOC Performance Coach (Enhanced).

Generate a comprehensive coaching report in Vietnamese. Return ONLY valid JSON (no markdown).

KOC: {koc.display_name or koc.full_name or 'KOC'}

This Week's Metrics:
{json.dumps(current_metrics, ensure_ascii=False)}

4-Week Average (for comparison):
{json.dumps(four_week_avg, ensure_ascii=False)}

Peer Benchmark (top 10% KOCs):
{json.dumps(peer_benchmark, ensure_ascii=False)}

Trending Products in KOC's Niche:
{json.dumps(trending_products, ensure_ascii=False)}

Improvement vs 4-week avg: {improvement}%

Return this exact JSON structure:
{{
  "summary": "2-3 sentence performance summary in Vietnamese",
  "weekly_comparison": {{
    "current_vs_avg": "comparison analysis",
    "trend": "improving|stable|declining"
  }},
  "peer_benchmarking": {{
    "rank_analysis": "how KOC compares to top 10%",
    "gap_to_close": "what to focus on to reach top tier"
  }},
  "top_recommendations": [
    {{"action": "specific action", "expected_roi": "expected result", "priority": "high|medium|low"}}
  ],
  "action_items": [
    {{"action": "concrete next step", "expected_roi": "measurable outcome", "deadline": "timeframe"}}
  ],
  "trending_suggestions": ["product suggestion with reasoning"],
  "growth_strategy": "one key growth strategy"
}}
"""

    resp = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = resp.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        ai_report = json.loads(raw_text)
    except json.JSONDecodeError:
        ai_report = {"summary": raw_text, "top_recommendations": [], "action_items": []}

    # Determine week/year
    now = datetime.utcnow()
    iso_cal = now.isocalendar()
    week_number = iso_cal[1]
    year = iso_cal[0]

    # Compute peer rank
    peer_rank = None
    if peer_benchmark.get("total_kocs_ranked"):
        # Simple ranking: how does this KOC compare
        if curr_orders >= peer_benchmark.get("top10_avg_orders", 0):
            peer_rank = 1
        else:
            peer_rank = min(peer_benchmark["total_kocs_ranked"], 10)

    # Save report to DB
    report = CoachingReport(
        koc_id=koc_id,
        week_number=week_number,
        year=year,
        metrics_snapshot=current_metrics,
        recommendations=ai_report,
        action_items=ai_report.get("action_items", []),
        peer_rank=peer_rank,
        improvement_score=improvement,
    )
    db.add(report)
    await db.commit()

    return {
        "report_id": str(report.id),
        "report": ai_report,
        "metrics": {
            "current_week": current_metrics,
            "four_week_avg": four_week_avg,
            "peer_benchmark": peer_benchmark,
            "improvement_pct": improvement,
        },
        "trending_products": trending_products,
    }


# ── GET /ai/coaching/{koc_id}/history ─────────────────────────

@router.get("/coaching/{koc_id}/history", response_model=CoachingReportListResponse)
async def get_coaching_history(
    koc_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    """Past coaching reports for a KOC."""
    # KOCs can only see their own; admins see all
    if (
        str(current_user.id) != str(koc_id)
        and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ):
        raise HTTPException(403, "Không có quyền xem báo cáo của KOC khác")

    count_q = select(func.count(CoachingReport.id)).where(CoachingReport.koc_id == koc_id)
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(CoachingReport)
        .where(CoachingReport.koc_id == koc_id)
        .order_by(desc(CoachingReport.created_at))
        .limit(limit)
    )
    rows = (await db.execute(q)).scalars().all()

    return CoachingReportListResponse(items=rows, total=total)


# ── POST /ai/coaching/batch ───────────────────────────────────

@router.post("/coaching/batch", response_model=BatchCoachingResponse)
async def batch_coaching(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Admin triggers batch coaching for all active KOCs.
    Generates coaching reports for each active KOC.
    """
    # Find all active KOCs
    koc_q = (
        select(User.id)
        .where(User.role == UserRole.KOC, User.is_active == True)
    )
    koc_ids = (await db.execute(koc_q)).scalars().all()

    if not koc_ids:
        return BatchCoachingResponse(triggered=0, koc_ids=[])

    now = datetime.utcnow()
    iso_cal = now.isocalendar()
    week_number = iso_cal[1]
    year = iso_cal[0]

    triggered_ids: list[str] = []
    for kid in koc_ids:
        # Check if report already exists for this week
        existing = await db.execute(
            select(CoachingReport.id).where(
                CoachingReport.koc_id == kid,
                CoachingReport.week_number == week_number,
                CoachingReport.year == year,
            )
        )
        if existing.scalar_one_or_none():
            continue  # Skip already-generated

        # Fetch metrics and create report (without AI call for batch efficiency)
        metrics = await _fetch_koc_metrics(kid, db, weeks_back=1)
        four_week = await _fetch_4week_avg(kid, db)
        prev_orders = four_week.get("total_orders", 0) / 4 if four_week.get("total_orders") else 0
        curr_orders = metrics.get("total_orders", 0)
        improvement = round(
            ((curr_orders - prev_orders) / max(prev_orders, 1)) * 100, 2
        )

        report = CoachingReport(
            koc_id=kid,
            week_number=week_number,
            year=year,
            metrics_snapshot=metrics,
            recommendations={"summary": "Batch-generated — run individual coaching for full AI report"},
            action_items=[],
            improvement_score=improvement,
        )
        db.add(report)
        triggered_ids.append(str(kid))

    await db.commit()

    return BatchCoachingResponse(
        triggered=len(triggered_ids),
        koc_ids=triggered_ids,
    )
