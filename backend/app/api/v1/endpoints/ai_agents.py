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
from app.core.ai_rate_limiter import ai_rate_limit
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
    _rl: None = Depends(ai_rate_limit),
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
async def generate_hashtags(body: HashtagRequest, current_user: User = Depends(get_current_user), _rl: None = Depends(ai_rate_limit)):
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
    _rl: None = Depends(ai_rate_limit),
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
async def generate_affiliate_link(body: LinkRequest, current_user: User = Depends(get_current_user), _rl: None = Depends(ai_rate_limit)):
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
    _rl: None = Depends(ai_rate_limit),
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
    _rl: None = Depends(ai_rate_limit),
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
    _rl: None = Depends(ai_rate_limit),
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


# ══════════════════════════════════════════════════════════════════════════════
# AGENTS A02 – A60 (additional 10 agents)
# ══════════════════════════════════════════════════════════════════════════════

# ── Agent A02: Video Script Generator ────────────────────────
class VideoScriptRequest(BaseModel):
    product_name: str = Field(..., max_length=200)
    product_desc: Optional[str] = Field(None, max_length=500)
    platform: str = Field("tiktok", pattern="^(tiktok|youtube|instagram|facebook)$")
    duration_seconds: int = Field(60, ge=15, le=600)
    tone: str = Field("enthusiastic", pattern="^(enthusiastic|educational|storytelling|testimonial)$")
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/video-script")
async def generate_video_script(
    body: VideoScriptRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A02: Generate short-video script with hook, body, CTA for KOC content."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A02 — Video Script Specialist.

Create a {body.duration_seconds}-second {body.platform.upper()} video script for:
- Product: {body.product_name}
- Description: {body.product_desc or 'N/A'}
- Tone: {body.tone}
- Language: {lang}

Script structure:
1. HOOK (0-3s): Attention-grabbing opening line
2. PROBLEM (3-10s): Pain point the product solves
3. SOLUTION (10-{body.duration_seconds - 10}s): Product demo/benefits (3-5 points)
4. SOCIAL PROOF ({body.duration_seconds - 10}s): Rating/reviews/testimonial angle
5. CTA (last 5s): Clear call-to-action + {{AFFILIATE_LINK}}

Also provide:
- B-roll suggestions for each segment
- On-screen text overlays
- Background music mood suggestion

Format: labeled sections, Vietnamese subtitles if language=vi.
Write the complete script only."""

    async def stream_script():
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream_script(), media_type="text/plain")


# ── Agent A05: Trend Radar ────────────────────────────────────
class TrendRadarRequest(BaseModel):
    category: str = Field(..., max_length=100, description="Product category to analyze")
    market: str = Field("vietnam", pattern="^(vietnam|southeast_asia|global)$")
    horizon: str = Field("week", pattern="^(day|week|month)$")
    language: str = Field("vi", pattern="^(vi|en)$")


class TrendRadarResponse(BaseModel):
    trending_topics: list[str]
    rising_keywords: list[str]
    declining_keywords: list[str]
    opportunity_score: float
    recommended_products: list[str]
    posting_window: str
    summary: str


@router.post("/trend-radar", response_model=TrendRadarResponse)
async def trend_radar(
    body: TrendRadarRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A05: Analyze trending topics + keywords for KOC content strategy."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A05 — Trend Radar Specialist.

Analyze trending content for:
- Category: {body.category}
- Market: {body.market}
- Time horizon: {body.horizon}
- Language: {lang}

Return ONLY valid JSON matching this schema:
{{
  "trending_topics": ["topic1", "topic2", ...],
  "rising_keywords": ["keyword1", ...],
  "declining_keywords": ["keyword1", ...],
  "opportunity_score": 0.0-10.0,
  "recommended_products": ["product type 1", ...],
  "posting_window": "best time to post (e.g. 7-9pm weekdays)",
  "summary": "2-sentence strategic summary in {lang}"
}}"""

    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    import json as _json
    try:
        raw = msg.content[0].text.strip()
        # Strip markdown fences if any
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        data = _json.loads(raw)
        return TrendRadarResponse(**data)
    except Exception:
        raise HTTPException(500, "AI returned invalid response format")


# ── Agent A08: Price Optimizer ────────────────────────────────
class PriceOptimizerRequest(BaseModel):
    product_name: str = Field(..., max_length=200)
    current_price: float = Field(..., gt=0)
    cost_price: Optional[float] = Field(None, gt=0)
    category: str = Field(..., max_length=100)
    competitor_prices: Optional[list[float]] = Field(None, max_length=10)
    target_margin: Optional[float] = Field(None, ge=0, le=1, description="0.0-1.0")


@router.post("/price-optimizer")
async def price_optimizer(
    body: PriceOptimizerRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A08: AI-powered price optimization with competitor benchmarking."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    comp_text = f"Competitor prices: {body.competitor_prices}" if body.competitor_prices else "No competitor data provided"
    cost_text = f"Cost price: {body.cost_price:,.0f}đ" if body.cost_price else "Cost unknown"
    margin_text = f"Target margin: {body.target_margin * 100:.0f}%" if body.target_margin else ""

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A08 — Pricing Intelligence Specialist.

Optimize pricing for:
- Product: {body.product_name}
- Category: {body.category}
- Current price: {body.current_price:,.0f}đ
- {cost_text}
- {comp_text}
- {margin_text}

Analyze and return JSON:
{{
  "recommended_price": number,
  "price_range": {{"min": number, "max": number}},
  "strategy": "penetration|competitive|premium|value",
  "koc_commission_impact": "how this affects KOC earnings",
  "flash_sale_price": number,
  "justification": "2-3 sentences explaining the recommendation in Vietnamese",
  "confidence": 0.0-1.0
}}"""

    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    import json as _json
    try:
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        return _json.loads(raw)
    except Exception:
        raise HTTPException(500, "AI returned invalid response format")


# ── Agent A10: Review Responder ───────────────────────────────
class ReviewResponderRequest(BaseModel):
    product_name: str = Field(..., max_length=200)
    review_text: str = Field(..., max_length=1000)
    review_rating: int = Field(..., ge=1, le=5)
    vendor_name: str = Field(..., max_length=100)
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/review-responder")
async def review_responder(
    body: ReviewResponderRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A10: Generate empathetic, professional vendor responses to reviews."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    sentiment = "positive" if body.review_rating >= 4 else "neutral" if body.review_rating == 3 else "negative"
    lang = "Vietnamese" if body.language == "vi" else "English"

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A10 — Customer Relations Specialist.

Write a professional vendor response to this {sentiment} review:
- Product: {body.product_name}
- Vendor: {body.vendor_name}
- Rating: {body.review_rating}/5 stars
- Review: "{body.review_text}"
- Language: {lang}

Guidelines:
- Thank the customer by name if mentioned
- For negative reviews: acknowledge issue, apologize sincerely, offer solution
- For positive reviews: express gratitude, highlight key benefit they mentioned
- Keep it concise (2-3 sentences max)
- Maintain professional yet warm tone
- Include an offer for next purchase if negative
- Write ONLY the response text, no labels"""

    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return {
        "response": msg.content[0].text.strip(),
        "sentiment": sentiment,
        "recommended_action": "offer_discount" if body.review_rating <= 2 else "thank_and_encourage",
    }


# ── Agent A15: Product Description Writer ────────────────────
class ProductDescRequest(BaseModel):
    product_name: str = Field(..., max_length=200)
    key_features: list[str] = Field(..., max_length=10)
    target_audience: Optional[str] = Field(None, max_length=200)
    brand: Optional[str] = Field(None, max_length=100)
    origin: Optional[str] = Field(None, max_length=100)
    certifications: Optional[list[str]] = Field(None, max_length=5)
    dpp_verified: bool = False
    language: str = Field("vi", pattern="^(vi|en)$")
    style: str = Field("ecommerce", pattern="^(ecommerce|luxury|health|tech|food)$")


@router.post("/product-description")
async def product_description_writer(
    body: ProductDescRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A15: Generate SEO-optimized product descriptions for vendor listings."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    features = "\n".join(f"- {f}" for f in body.key_features)
    certs = ", ".join(body.certifications) if body.certifications else "None"
    dpp_text = "Sản phẩm có DPP NFT — xác thực blockchain, đảm bảo nguồn gốc 100%." if body.dpp_verified else ""

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A15 — Product Content Specialist.

Write an SEO-optimized product description in {lang}:
- Product: {body.product_name}
- Brand: {body.brand or 'N/A'}
- Origin: {body.origin or 'N/A'}
- Target audience: {body.target_audience or 'general consumers'}
- Style: {body.style}
- Key features:
{features}
- Certifications: {certs}
- DPP: {dpp_text}

Sections to include:
1. Intro paragraph (2-3 sentences, hook the reader)
2. Key Benefits (bullet list, 4-6 points)
3. How to Use / Specifications
4. Quality Guarantee / Certifications
5. SEO-friendly meta description (155 chars max)

Write the complete description in {lang}."""

    async def stream_desc():
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream_desc(), media_type="text/plain")


# ── Agent A22: Campaign Performance Analyzer ─────────────────
class CampaignAnalyzerRequest(BaseModel):
    campaign_name: str = Field(..., max_length=200)
    platform: str = Field("tiktok", pattern="^(tiktok|instagram|facebook|youtube|all)$")
    impressions: int = Field(..., ge=0)
    clicks: int = Field(..., ge=0)
    conversions: int = Field(..., ge=0)
    revenue: float = Field(..., ge=0)
    ad_spend: float = Field(0, ge=0)
    duration_days: int = Field(..., ge=1, le=365)
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/campaign-analyzer")
async def campaign_analyzer(
    body: CampaignAnalyzerRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A22: Analyze campaign KPIs and generate improvement recommendations."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    ctr = (body.clicks / body.impressions * 100) if body.impressions > 0 else 0
    cvr = (body.conversions / body.clicks * 100) if body.clicks > 0 else 0
    roas = (body.revenue / body.ad_spend) if body.ad_spend > 0 else 0
    rpi = body.revenue / body.impressions if body.impressions > 0 else 0

    lang = "Vietnamese" if body.language == "vi" else "English"

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A22 — Campaign Performance Analyst.

Analyze this campaign and provide actionable insights in {lang}:
- Campaign: {body.campaign_name}
- Platform: {body.platform}
- Duration: {body.duration_days} days
- Impressions: {body.impressions:,}
- Clicks: {body.clicks:,} (CTR: {ctr:.2f}%)
- Conversions: {body.conversions:,} (CVR: {cvr:.2f}%)
- Revenue: {body.revenue:,.0f}đ
- Ad Spend: {body.ad_spend:,.0f}đ (ROAS: {roas:.2f}x)

Return JSON:
{{
  "performance_grade": "A/B/C/D/F",
  "ctr_benchmark": "above/below/at industry average",
  "cvr_benchmark": "above/below/at industry average",
  "top_3_issues": ["issue1", ...],
  "top_3_recommendations": ["rec1", ...],
  "budget_recommendation": "increase/maintain/decrease",
  "projected_improvement_pct": number,
  "summary": "2-3 sentence executive summary in {lang}"
}}"""

    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    import json as _json
    try:
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        data = _json.loads(raw)
        data.update({"ctr": round(ctr, 2), "cvr": round(cvr, 2), "roas": round(roas, 2)})
        return data
    except Exception:
        raise HTTPException(500, "AI returned invalid response format")


# ── Agent A30: Customer Segment Profiler ─────────────────────
class SegmentProfilerRequest(BaseModel):
    segment_name: str = Field(..., max_length=100)
    age_range: Optional[str] = Field(None, description="e.g. 25-35")
    gender: Optional[str] = Field(None, pattern="^(male|female|all)$")
    location: Optional[str] = Field(None, max_length=100)
    avg_order_value: Optional[float] = Field(None, gt=0)
    purchase_frequency: Optional[str] = Field(None, pattern="^(weekly|monthly|quarterly|occasional)$")
    top_categories: Optional[list[str]] = Field(None, max_length=5)
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/segment-profiler")
async def segment_profiler(
    body: SegmentProfilerRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A30: Profile a customer segment and recommend targeting strategies."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    details = []
    if body.age_range: details.append(f"Age: {body.age_range}")
    if body.gender: details.append(f"Gender: {body.gender}")
    if body.location: details.append(f"Location: {body.location}")
    if body.avg_order_value: details.append(f"AOV: {body.avg_order_value:,.0f}đ")
    if body.purchase_frequency: details.append(f"Purchase frequency: {body.purchase_frequency}")
    if body.top_categories: details.append(f"Top categories: {', '.join(body.top_categories)}")

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A30 — Customer Intelligence Specialist.

Profile this customer segment and provide KOC targeting recommendations in {lang}:
- Segment: {body.segment_name}
- {chr(10).join(details) or 'No demographic data provided'}

Return JSON:
{{
  "persona_name": "catchy persona name",
  "pain_points": ["pain1", "pain2", "pain3"],
  "motivations": ["motivation1", ...],
  "preferred_content_format": ["format1", ...],
  "best_platforms": ["platform1", ...],
  "best_posting_times": ["time1", ...],
  "messaging_angle": "key message to resonate with this segment",
  "product_categories": ["recommended category1", ...],
  "koc_profile_fit": "what type of KOC appeals to this segment",
  "summary": "2-3 sentence segment summary in {lang}"
}}"""

    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=700,
        messages=[{"role": "user", "content": prompt}],
    )
    import json as _json
    try:
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        return _json.loads(raw)
    except Exception:
        raise HTTPException(500, "AI returned invalid response format")


# ── Agent A40: Live Stream Script Planner ────────────────────
class LiveStreamPlannerRequest(BaseModel):
    session_title: str = Field(..., max_length=200)
    products: list[str] = Field(..., max_length=20, description="List of product names to feature")
    duration_minutes: int = Field(60, ge=15, le=240)
    koc_name: Optional[str] = Field(None, max_length=100)
    platform: str = Field("tiktok", pattern="^(tiktok|shopee|facebook|youtube)$")
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/livestream-planner")
async def livestream_planner(
    body: LiveStreamPlannerRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A40: Create minute-by-minute live stream script with engagement tactics."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    products_list = "\n".join(f"- {p}" for p in body.products)

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A40 — Live Commerce Strategist.

Create a {body.duration_minutes}-minute live stream plan in {lang}:
- Session: {body.session_title}
- Platform: {body.platform}
- KOC: {body.koc_name or 'WellKOC KOC'}
- Products to feature:
{products_list}

Provide a minute-by-minute script with:
1. Opening hook (first 2 min): greeting + teaser
2. Warm-up (2-10 min): audience engagement + poll
3. Product segments (10-{body.duration_minutes - 10} min): each product with demo + price reveal
4. Flash sale trigger timing (pick best moment for max urgency)
5. Q&A segment
6. Closing (last 5 min): summary + CTA + affiliate link

Include engagement prompts (questions to ask audience) every 5 minutes.
Format as clear timeline with timestamps."""

    async def stream_plan():
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream_plan(), media_type="text/plain")


# ── Agent A50: DPP Story Generator ───────────────────────────
class DPPStoryRequest(BaseModel):
    product_name: str = Field(..., max_length=200)
    origin_country: str = Field(..., max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=200)
    certifications: Optional[list[str]] = Field(None, max_length=10)
    nft_token_id: Optional[str] = Field(None, max_length=100)
    supply_chain_steps: Optional[list[str]] = Field(None, max_length=10)
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/dpp-story")
async def dpp_story_generator(
    body: DPPStoryRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A50: Generate blockchain-verified product origin story for DPP marketing."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    chain = "\n".join(f"- {s}" for s in body.supply_chain_steps) if body.supply_chain_steps else "Not provided"
    certs = ", ".join(body.certifications) if body.certifications else "None"
    nft_text = f"NFT Token #{body.nft_token_id} on Polygon blockchain" if body.nft_token_id else "DPP verified on WellKOC blockchain"

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A50 — DPP Authenticity Storyteller.

Write a compelling origin story for this blockchain-verified product in {lang}:
- Product: {body.product_name}
- Origin: {body.origin_country}
- Manufacturer: {body.manufacturer or 'N/A'}
- Certifications: {certs}
- Blockchain verification: {nft_text}
- Supply chain journey:
{chain}

Create:
1. Short story (3-4 sentences) about the product's journey from origin to consumer
2. Trust-building statement highlighting blockchain verification
3. 3 social media captions (TikTok/IG/Facebook) that emphasize authenticity
4. FAQ answers for "How do I verify this product is authentic?"

Write in {lang}, emphasize trust and transparency."""

    async def stream_story():
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream_story(), media_type="text/plain")


# ── Agent A60: KOC Onboarding Coach ──────────────────────────
class OnboardingCoachRequest(BaseModel):
    user_name: str = Field(..., max_length=100)
    niche: str = Field(..., max_length=100, description="e.g. skincare, food, fashion")
    platform_experience: str = Field("beginner", pattern="^(beginner|intermediate|advanced)$")
    follower_count: int = Field(0, ge=0)
    goals: Optional[list[str]] = Field(None, max_length=5)
    language: str = Field("vi", pattern="^(vi|en)$")


@router.post("/onboarding-coach")
async def onboarding_coach(
    body: OnboardingCoachRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = Depends(ai_rate_limit),
):
    """Agent A60: Personalized 30-day onboarding plan for new KOCs."""
    if not client:
        raise HTTPException(503, "AI service unavailable")

    lang = "Vietnamese" if body.language == "vi" else "English"
    goals_text = ", ".join(body.goals) if body.goals else "earn commission, grow audience"

    prompt = f"""{PLATFORM_CONTEXT}
You are Agent A60 — KOC Success Coach.

Create a personalized 30-day onboarding plan in {lang} for:
- Name: {body.user_name}
- Niche: {body.niche}
- Experience level: {body.platform_experience}
- Current followers: {body.follower_count:,}
- Goals: {goals_text}

WellKOC commission structure: T1 (direct referral) = 40%, T2 = 13%
DPP NFT products available for authenticity marketing angle.

Provide:
1. Week 1 (Days 1-7): Foundation tasks (profile, first content, first product link)
2. Week 2 (Days 8-14): Growth tactics (engagement, collaborations, hashtag strategy)
3. Week 3 (Days 15-21): Monetization (affiliate links, flash sales, group buys)
4. Week 4 (Days 22-30): Scale (analytics review, tier upgrade strategy, mentoring T2)
5. First 3 products to promote (based on niche)
6. Success metrics to track (week-by-week targets)

Be specific, actionable, and encouraging. Write in {lang}."""

    async def stream_plan():
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream_plan(), media_type="text/plain")
