"""
WellKOC — Fraud Detection Engine Endpoints (Module #38)
Real-time fraud scoring, alerts, self-referral detection, admin resolution.

Scoring factors & weights:
  +30  Same IP buyer/KOC
  +25  Same device fingerprint
  +15  Order within 5 min of affiliate click
  +40  KOC buying own product
  +20  Commission amount > 3σ from average
  +10  New account < 24h

Thresholds:  <60 safe | 60-80 flagged | 80-95 auto-pause | >95 auto-block
"""
import statistics
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.fraud import (
    FraudScore, FraudAlert,
    FraudAction, AlertType, AlertSeverity, AlertStatus, AlertResolution,
)
from app.models.order import Order, Commission
from app.models.user import User, UserRole

router = APIRouter(prefix="/fraud", tags=["Fraud Detection"])


# ── Schemas ──────────────────────────────────────────────────

class ResolveAlertReq(BaseModel):
    resolution: str = Field(..., description="confirm_fraud or false_positive")


class ScanReq(BaseModel):
    days: int = Field(default=30, ge=1, le=365)


# ── Helpers ──────────────────────────────────────────────────

def _score_dict(s: FraudScore) -> dict:
    return {
        "id": str(s.id),
        "order_id": str(s.order_id),
        "score": s.score,
        "factors": s.factors,
        "action_taken": s.action_taken,
        "is_fraud": s.is_fraud,
        "resolved_by": str(s.resolved_by) if s.resolved_by else None,
        "resolved_at": s.resolved_at.isoformat() if s.resolved_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _alert_dict(a: FraudAlert) -> dict:
    return {
        "id": str(a.id),
        "order_id": str(a.order_id),
        "koc_id": str(a.koc_id),
        "alert_type": a.alert_type,
        "severity": a.severity,
        "details": a.details,
        "status": a.status,
        "resolved_by": str(a.resolved_by) if a.resolved_by else None,
        "resolution": a.resolution,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _determine_action(score: int) -> str:
    """Map fraud score to automatic action."""
    if score >= 95:
        return FraudAction.BLOCKED
    elif score >= 80:
        return FraudAction.PAUSED
    elif score >= 60:
        return FraudAction.FLAGGED
    return FraudAction.NONE


def _determine_severity(score: int) -> str:
    """Map fraud score to alert severity."""
    if score >= 95:
        return AlertSeverity.CRITICAL
    elif score >= 80:
        return AlertSeverity.HIGH
    elif score >= 60:
        return AlertSeverity.MEDIUM
    return AlertSeverity.LOW


async def _calculate_fraud_score(order_id: UUID, db: AsyncSession) -> dict:
    """
    Calculate a real-time fraud score for an order.
    Returns {score, factors, action_taken}.
    """
    # Load order
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Đơn hàng không tồn tại")

    factors = {}
    score = 0

    # Load buyer
    buyer_r = await db.execute(select(User).where(User.id == order.buyer_id))
    buyer = buyer_r.scalar_one_or_none()

    koc_id = order.koc_t1_id

    # ── Factor 1: KOC buying own product (+40) ────────────────
    if koc_id and str(order.buyer_id) == str(koc_id):
        factors["koc_buying_own_product"] = {
            "points": 40,
            "detail": "Buyer is the same as referring KOC",
        }
        score += 40

    # ── Factor 2: Same IP buyer / KOC (+30) ───────────────────
    # Check shipping_address metadata for IP (stored during checkout)
    buyer_ip = (order.shipping_address or {}).get("ip")
    if buyer_ip and koc_id:
        # Look for recent orders from same KOC with same IP
        ip_check = await db.execute(
            select(func.count()).select_from(Order).where(
                Order.koc_t1_id == koc_id,
                Order.id != order.id,
                Order.shipping_address["ip"].astext == buyer_ip,
            )
        )
        if (ip_check.scalar() or 0) > 0:
            factors["same_ip_buyer_koc"] = {
                "points": 30,
                "detail": f"Buyer IP {buyer_ip} matches other orders from same KOC",
            }
            score += 30

    # ── Factor 3: Same device fingerprint (+25) ───────────────
    device_fp = (order.shipping_address or {}).get("device_fingerprint")
    if device_fp and koc_id:
        fp_check = await db.execute(
            select(func.count()).select_from(Order).where(
                Order.koc_t1_id == koc_id,
                Order.id != order.id,
                Order.shipping_address["device_fingerprint"].astext == device_fp,
            )
        )
        if (fp_check.scalar() or 0) > 0:
            factors["same_device_fingerprint"] = {
                "points": 25,
                "detail": "Device fingerprint matches other orders from same KOC",
            }
            score += 25

    # ── Factor 4: Order within 5 min of affiliate click (+15) ─
    if order.affiliate_link_id and order.created_at:
        # Check if order was placed suspiciously fast after click
        # We use the status_history to detect rapid click-to-order
        click_time_str = (order.shipping_address or {}).get("affiliate_click_at")
        if click_time_str:
            try:
                click_time = datetime.fromisoformat(click_time_str)
                order_time = order.created_at
                if order_time.tzinfo is None:
                    order_time = order_time.replace(tzinfo=timezone.utc)
                if click_time.tzinfo is None:
                    click_time = click_time.replace(tzinfo=timezone.utc)
                delta = (order_time - click_time).total_seconds()
                if 0 < delta < 300:  # 5 minutes
                    factors["quick_affiliate_order"] = {
                        "points": 15,
                        "detail": f"Order placed {int(delta)}s after affiliate click",
                    }
                    score += 15
            except (ValueError, TypeError):
                pass

    # ── Factor 5: Commission amount > 3σ from average (+20) ───
    if koc_id:
        comm_r = await db.execute(
            select(Commission.amount).where(Commission.koc_id == koc_id)
        )
        amounts = [float(row[0]) for row in comm_r.all()]
        if len(amounts) >= 5:
            mean_amt = statistics.mean(amounts)
            stdev_amt = statistics.stdev(amounts)
            if stdev_amt > 0:
                order_comm_r = await db.execute(
                    select(Commission.amount).where(Commission.order_id == order.id)
                )
                order_amounts = [float(row[0]) for row in order_comm_r.all()]
                for amt in order_amounts:
                    if amt > mean_amt + 3 * stdev_amt:
                        factors["commission_outlier"] = {
                            "points": 20,
                            "detail": f"Commission {amt:,.0f} VND exceeds 3σ (mean={mean_amt:,.0f}, σ={stdev_amt:,.0f})",
                        }
                        score += 20
                        break

    # ── Factor 6: New account < 24h (+10) ─────────────────────
    if buyer and buyer.created_at:
        account_age = datetime.now(timezone.utc) - (
            buyer.created_at.replace(tzinfo=timezone.utc)
            if buyer.created_at.tzinfo is None
            else buyer.created_at
        )
        if account_age < timedelta(hours=24):
            factors["new_account"] = {
                "points": 10,
                "detail": f"Buyer account created {account_age.total_seconds() / 3600:.1f}h ago",
            }
            score += 10

    # Cap at 100
    score = min(score, 100)
    action = _determine_action(score)

    return {
        "order_id": order_id,
        "score": score,
        "factors": factors,
        "action_taken": action,
    }


# ── Endpoints ────────────────────────────────────────────────

@router.get("/score/{order_id}")
async def get_fraud_score(
    order_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Real-time fraud score for an order (0-100).
    Calculates on-the-fly, persists result, and auto-creates alerts if needed.
    """
    scoring = await _calculate_fraud_score(order_id, db)
    score = scoring["score"]
    action = scoring["action_taken"]

    # Upsert FraudScore record
    existing_r = await db.execute(
        select(FraudScore).where(FraudScore.order_id == order_id)
    )
    existing = existing_r.scalar_one_or_none()

    if existing:
        existing.score = score
        existing.factors = scoring["factors"]
        existing.action_taken = action
        db.add(existing)
        fraud_score = existing
    else:
        fraud_score = FraudScore(
            order_id=order_id,
            score=score,
            factors=scoring["factors"],
            action_taken=action,
        )
        db.add(fraud_score)

    # Auto-create alert if score >= 60
    if score >= 60:
        # Load order for koc_id
        order_r = await db.execute(select(Order).where(Order.id == order_id))
        order = order_r.scalar_one_or_none()
        koc_id = order.koc_t1_id or order.buyer_id

        # Determine alert type from highest-weight factor
        alert_type = AlertType.COMMISSION_ABUSE
        if "koc_buying_own_product" in scoring["factors"]:
            alert_type = AlertType.SELF_REFERRAL
        elif "same_device_fingerprint" in scoring["factors"]:
            alert_type = AlertType.DEVICE_MATCH
        elif "quick_affiliate_order" in scoring["factors"]:
            alert_type = AlertType.VELOCITY

        # Check if alert already exists for this order
        alert_exists = await db.execute(
            select(func.count()).select_from(FraudAlert).where(
                FraudAlert.order_id == order_id,
            )
        )
        if (alert_exists.scalar() or 0) == 0:
            alert = FraudAlert(
                order_id=order_id,
                koc_id=koc_id,
                alert_type=alert_type,
                severity=_determine_severity(score),
                details=scoring["factors"],
            )
            db.add(alert)

    await db.commit()

    return _score_dict(fraud_score)


@router.get("/alerts")
async def list_fraud_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """List fraud alerts (admin only)."""
    q = select(FraudAlert)
    if status:
        q = q.where(FraudAlert.status == status)
    if severity:
        q = q.where(FraudAlert.severity == severity)
    if alert_type:
        q = q.where(FraudAlert.alert_type == alert_type)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_r.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page).order_by(FraudAlert.created_at.desc())
    result = await db.execute(q)
    alerts = result.scalars().all()

    return {"items": [_alert_dict(a) for a in alerts], "total": total, "page": page}


@router.put("/alerts/{alert_id}/resolve")
async def resolve_fraud_alert(
    alert_id: UUID,
    body: ResolveAlertReq,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Admin resolves a fraud alert as confirm_fraud or false_positive."""
    if body.resolution not in (AlertResolution.CONFIRM_FRAUD, AlertResolution.FALSE_POSITIVE):
        raise HTTPException(400, "resolution phải là 'confirm_fraud' hoặc 'false_positive'")

    result = await db.execute(select(FraudAlert).where(FraudAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Cảnh báo gian lận không tồn tại")

    alert.status = AlertStatus.RESOLVED
    alert.resolved_by = current_user.id
    alert.resolution = body.resolution
    db.add(alert)

    # Also update the FraudScore record
    score_r = await db.execute(
        select(FraudScore).where(FraudScore.order_id == alert.order_id)
    )
    fraud_score = score_r.scalar_one_or_none()
    if fraud_score:
        fraud_score.resolved_by = current_user.id
        fraud_score.resolved_at = datetime.now(timezone.utc)
        fraud_score.is_fraud = (body.resolution == AlertResolution.CONFIRM_FRAUD)
        db.add(fraud_score)

    await db.commit()
    return {"message": "Đã xử lý cảnh báo", "alert": _alert_dict(alert)}


@router.get("/self-referral")
async def detect_self_referrals(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Detect self-referral patterns: KOCs buying through their own affiliate links."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Find orders where buyer_id == koc_t1_id
    result = await db.execute(
        select(Order).where(
            Order.koc_t1_id.isnot(None),
            Order.buyer_id == Order.koc_t1_id,
            Order.created_at >= since,
        ).order_by(Order.created_at.desc())
    )
    suspicious_orders = result.scalars().all()

    patterns = []
    for order in suspicious_orders:
        patterns.append({
            "order_id": str(order.id),
            "order_number": order.order_number,
            "koc_id": str(order.koc_t1_id),
            "total": float(order.total),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "pattern": "koc_is_buyer",
        })

    # Also detect same-household patterns (same shipping address across different buyers for same KOC)
    koc_addr_result = await db.execute(
        select(
            Order.koc_t1_id,
            Order.shipping_address["city"].astext.label("city"),
            Order.shipping_address["address"].astext.label("address"),
            func.count(func.distinct(Order.buyer_id)).label("unique_buyers"),
            func.count(Order.id).label("order_count"),
        )
        .where(
            Order.koc_t1_id.isnot(None),
            Order.created_at >= since,
        )
        .group_by(
            Order.koc_t1_id,
            Order.shipping_address["city"].astext,
            Order.shipping_address["address"].astext,
        )
        .having(func.count(func.distinct(Order.buyer_id)) > 1)
    )
    address_clusters = koc_addr_result.all()

    for cluster in address_clusters:
        if cluster.order_count >= 3:
            patterns.append({
                "koc_id": str(cluster.koc_t1_id),
                "address": f"{cluster.address}, {cluster.city}",
                "unique_buyers": cluster.unique_buyers,
                "order_count": cluster.order_count,
                "pattern": "same_address_multiple_buyers",
            })

    return {
        "period_days": days,
        "total_suspicious": len(patterns),
        "patterns": patterns,
    }


@router.get("/stats")
async def fraud_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Fraud statistics: totals, rates, breakdowns."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total scores by action
    action_stats = await db.execute(
        select(
            FraudScore.action_taken,
            func.count(FraudScore.id).label("count"),
        )
        .where(FraudScore.created_at >= since)
        .group_by(FraudScore.action_taken)
    )
    action_breakdown = {row.action_taken: row.count for row in action_stats.all()}

    # Resolved alerts
    resolved_r = await db.execute(
        select(
            FraudAlert.resolution,
            func.count(FraudAlert.id).label("count"),
        )
        .where(
            FraudAlert.status == AlertStatus.RESOLVED,
            FraudAlert.created_at >= since,
        )
        .group_by(FraudAlert.resolution)
    )
    resolution_breakdown = {row.resolution: row.count for row in resolved_r.all()}

    total_resolved = sum(resolution_breakdown.values())
    false_positives = resolution_breakdown.get(AlertResolution.FALSE_POSITIVE, 0)
    false_positive_rate = (false_positives / total_resolved * 100) if total_resolved > 0 else 0.0

    # Open alerts count
    open_r = await db.execute(
        select(func.count()).select_from(FraudAlert).where(
            FraudAlert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING]),
        )
    )
    open_alerts = open_r.scalar() or 0

    # Alert type breakdown
    type_stats = await db.execute(
        select(
            FraudAlert.alert_type,
            func.count(FraudAlert.id).label("count"),
        )
        .where(FraudAlert.created_at >= since)
        .group_by(FraudAlert.alert_type)
    )
    type_breakdown = {row.alert_type: row.count for row in type_stats.all()}

    return {
        "period_days": days,
        "total_scored": sum(action_breakdown.values()),
        "action_breakdown": action_breakdown,
        "total_flagged": action_breakdown.get(FraudAction.FLAGGED, 0),
        "total_paused": action_breakdown.get(FraudAction.PAUSED, 0),
        "total_blocked": action_breakdown.get(FraudAction.BLOCKED, 0),
        "open_alerts": open_alerts,
        "resolved_alerts": total_resolved,
        "false_positive_rate": round(false_positive_rate, 2),
        "resolution_breakdown": resolution_breakdown,
        "alert_type_breakdown": type_breakdown,
    }


@router.post("/scan")
async def trigger_fraud_scan(
    body: ScanReq = ScanReq(),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Admin triggers a full network fraud scan over recent orders."""
    since = datetime.now(timezone.utc) - timedelta(days=body.days)

    # Find all orders with affiliate/KOC referrals in the period
    result = await db.execute(
        select(Order.id).where(
            Order.koc_t1_id.isnot(None),
            Order.created_at >= since,
        )
    )
    order_ids = [row[0] for row in result.all()]

    scanned = 0
    flagged = 0

    for oid in order_ids:
        try:
            scoring = await _calculate_fraud_score(oid, db)
            score = scoring["score"]
            action = scoring["action_taken"]

            # Upsert FraudScore
            existing_r = await db.execute(
                select(FraudScore).where(FraudScore.order_id == oid)
            )
            existing = existing_r.scalar_one_or_none()
            if existing:
                existing.score = score
                existing.factors = scoring["factors"]
                existing.action_taken = action
                db.add(existing)
            else:
                fs = FraudScore(
                    order_id=oid,
                    score=score,
                    factors=scoring["factors"],
                    action_taken=action,
                )
                db.add(fs)

            scanned += 1
            if score >= 60:
                flagged += 1

                # Create alert if none exists
                order_r = await db.execute(select(Order).where(Order.id == oid))
                order = order_r.scalar_one_or_none()
                koc_id = order.koc_t1_id or order.buyer_id

                alert_exists = await db.execute(
                    select(func.count()).select_from(FraudAlert).where(
                        FraudAlert.order_id == oid,
                    )
                )
                if (alert_exists.scalar() or 0) == 0:
                    alert_type = AlertType.COMMISSION_ABUSE
                    if "koc_buying_own_product" in scoring["factors"]:
                        alert_type = AlertType.SELF_REFERRAL
                    elif "same_device_fingerprint" in scoring["factors"]:
                        alert_type = AlertType.DEVICE_MATCH
                    elif "quick_affiliate_order" in scoring["factors"]:
                        alert_type = AlertType.VELOCITY

                    alert = FraudAlert(
                        order_id=oid,
                        koc_id=koc_id,
                        alert_type=alert_type,
                        severity=_determine_severity(score),
                        details=scoring["factors"],
                    )
                    db.add(alert)

        except Exception:
            continue  # skip individual failures during bulk scan

    await db.commit()

    return {
        "message": f"Quét xong {scanned} đơn hàng trong {body.days} ngày gần nhất",
        "scanned": scanned,
        "flagged": flagged,
    }
