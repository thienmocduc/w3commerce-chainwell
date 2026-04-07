"""
WellKOC — API v1 Router
Registers all endpoint modules with prefix /api/v1
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    gamification, returns,
    auth, products, orders, cart, payments,
    commissions, koc, vendor, vendor_onboarding, admin, ai_agents,
    shipping, reviews, dpp, websocket, kyc,
    group_buy, live,
    social, membership,
    referral, share_links,
    pools, flash_sale,
    marketing_campaign,
    recommendations, ai_comments,
    publisher, fraud,
    events, compliance, analytics,
    verification,
    chatbot,
    notifications,
    upload,
    academy,
)

api_router = APIRouter()

# ── Auth & Users ─────────────────────────────────────────────
api_router.include_router(auth.router)
api_router.include_router(kyc.router)
api_router.include_router(verification.router)
api_router.include_router(notifications.router)

# ── Commerce ─────────────────────────────────────────────────
api_router.include_router(products.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(shipping.router)
api_router.include_router(reviews.router)
api_router.include_router(returns.router)

# ── Blockchain ───────────────────────────────────────────────
api_router.include_router(dpp.router)
api_router.include_router(commissions.router)

# ── Platform roles ───────────────────────────────────────────
api_router.include_router(koc.router)
api_router.include_router(vendor.router)
api_router.include_router(vendor_onboarding.router)
api_router.include_router(admin.router)

# ── AI & Intelligence ────────────────────────────────────────
api_router.include_router(ai_agents.router)
api_router.include_router(ai_comments.router)
api_router.include_router(marketing_campaign.router)
api_router.include_router(chatbot.router)

# ── Recommendations ──────────────────────────────────────────
api_router.include_router(recommendations.router)

# ── Social Commerce ─────────────────────────────────────────
api_router.include_router(group_buy.router)
api_router.include_router(live.router)
api_router.include_router(social.router)

# ── Referral & Share ───────────────────────────────────────
api_router.include_router(referral.router)
api_router.include_router(share_links.router)

# ── Membership ─────────────────────────────────────────────
api_router.include_router(membership.router)

# ── Gamification ────────────────────────────────────────────
api_router.include_router(gamification.router)

# ── Pool Rankings ───────────────────────────────────────────
api_router.include_router(pools.router)

# ── Flash Sale ─────────────────────────────────────────────
api_router.include_router(flash_sale.router)

# ── Multi-Platform Publisher ──────────────────────────────────
api_router.include_router(publisher.router)

# ── Fraud Detection ──────────────────────────────────────────
api_router.include_router(fraud.router)

# ── Social Shopping Events ──────────────────────────────────
api_router.include_router(events.router)

# ── Tax & Compliance ────────────────────────────────────────
api_router.include_router(compliance.router)

# ── Vendor BI Analytics ─────────────────────────────────────
api_router.include_router(analytics.router)

# ── File Upload ─────────────────────────────────────────────
api_router.include_router(upload.router)

# ── Academy / Learning ───────────────────────────────────────
api_router.include_router(academy.router)

# ── Real-time (WebSocket) ────────────────────────────────────
api_router.include_router(websocket.router)
