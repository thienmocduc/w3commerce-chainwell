"""
WellKOC — Tax, Compliance & Audit Export Endpoints (Module #50)
VAT reports, audit trails, commission reports, ATTP checks, blockchain proofs.
"""
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import CurrentUser, require_role
from app.models.user import UserRole
from app.models.order import Order, Commission, CommissionStatus
from app.models.compliance import (
    ComplianceReport, ReportType, ATTPCertification, CertStatus,
)

router = APIRouter(prefix="/compliance", tags=["Tax & Compliance"])


# ── Helpers ──────────────────────────────────────────────────

VAT_RATE = 0.10  # 10% Vietnam VAT

def _compute_sha256(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _parse_period(month: int, year: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


# ── VAT Report ───────────────────────────────────────────────

@router.get("/vat-report")
async def vat_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    current_user=Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR])),
    db: AsyncSession = Depends(get_db),
):
    """VAT report for a month/year. 10% VAT on all transactions, grouped by vendor."""
    start, end = _parse_period(month, year)

    # Base query: completed orders in period
    q = select(
        Order.vendor_id,
        func.sum(Order.total).label("revenue"),
        func.count(Order.id).label("order_count"),
    ).where(
        Order.status == "completed",
        Order.created_at >= start,
        Order.created_at < end,
    )

    # Vendor can only see their own
    if current_user.role == UserRole.VENDOR:
        q = q.where(Order.vendor_id == current_user.id)

    q = q.group_by(Order.vendor_id)
    result = await db.execute(q)
    rows = result.all()

    total_revenue = 0.0
    breakdown = []
    for vendor_id, revenue, order_count in rows:
        rev = float(revenue or 0)
        vat = round(rev * VAT_RATE, 2)
        total_revenue += rev
        breakdown.append({
            "vendor_id": str(vendor_id),
            "total_revenue": rev,
            "vat_amount": vat,
            "net_revenue": round(rev - vat, 2),
            "order_count": order_count,
        })

    total_vat = round(total_revenue * VAT_RATE, 2)
    return {
        "period": f"{year}-{month:02d}",
        "total_revenue": round(total_revenue, 2),
        "vat_rate": VAT_RATE,
        "vat_amount": total_vat,
        "net_revenue": round(total_revenue - total_vat, 2),
        "vendor_count": len(breakdown),
        "breakdown": breakdown,
    }


# ── Audit Trail ──────────────────────────────────────────────

@router.get("/audit")
async def audit_trail(
    from_date: datetime = Query(...),
    to_date: datetime = Query(...),
    entity_type: str = Query("order", regex="^(order|commission|product|user)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user=Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Audit trail export — all actions with timestamps, actor, SHA256 hash."""
    entries = []

    if entity_type == "order":
        q = select(Order).where(
            Order.created_at >= from_date,
            Order.created_at < to_date,
        ).order_by(Order.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(q)
        orders = result.scalars().all()
        for o in orders:
            record_str = f"{o.id}|{o.order_number}|{o.status}|{o.total}|{o.created_at}"
            entries.append({
                "entity_type": "order",
                "entity_id": str(o.id),
                "order_number": o.order_number,
                "status": o.status,
                "amount": float(o.total),
                "actor_id": str(o.buyer_id),
                "timestamp": o.created_at.isoformat() if o.created_at else None,
                "details": o.status_history,
                "sha256": _compute_sha256(record_str),
            })

    elif entity_type == "commission":
        q = select(Commission).where(
            Commission.created_at >= from_date,
            Commission.created_at < to_date,
        ).order_by(Commission.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(q)
        comms = result.scalars().all()
        for c in comms:
            record_str = f"{c.id}|{c.order_id}|{c.koc_id}|{c.amount}|{c.status}|{c.created_at}"
            entries.append({
                "entity_type": "commission",
                "entity_id": str(c.id),
                "order_id": str(c.order_id),
                "koc_id": str(c.koc_id),
                "amount": float(c.amount),
                "status": c.status,
                "actor_id": str(c.koc_id),
                "timestamp": c.created_at.isoformat() if c.created_at else None,
                "tx_hash": c.tx_hash,
                "sha256": _compute_sha256(record_str),
            })

    return {
        "entity_type": entity_type,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "page": page,
        "entries": entries,
        "count": len(entries),
    }


# ── Commission Report ────────────────────────────────────────

@router.get("/commission-report")
async def commission_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    current_user=Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Commission report for tax filing, grouped by KOC."""
    start, end = _parse_period(month, year)

    q = select(
        Commission.koc_id,
        func.sum(Commission.amount).label("total_earned"),
        func.count(Commission.id).label("tx_count"),
    ).where(
        Commission.created_at >= start,
        Commission.created_at < end,
        Commission.status == CommissionStatus.SETTLED,
    ).group_by(Commission.koc_id)

    result = await db.execute(q)
    rows = result.all()

    koc_reports = []
    grand_total = 0.0
    for koc_id, total_earned, tx_count in rows:
        earned = float(total_earned or 0)
        tax_withheld = round(earned * 0.10, 2)  # 10% PIT withholding
        net_paid = round(earned - tax_withheld, 2)
        grand_total += earned
        koc_reports.append({
            "koc_id": str(koc_id),
            "total_earned": earned,
            "tax_withheld": tax_withheld,
            "net_paid": net_paid,
            "transaction_count": tx_count,
        })

    return {
        "period": f"{year}-{month:02d}",
        "grand_total_earned": round(grand_total, 2),
        "grand_total_tax": round(grand_total * 0.10, 2),
        "koc_count": len(koc_reports),
        "koc_reports": koc_reports,
    }


# ── Export ────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    report_type: str = Field(..., pattern="^(vat|audit|commission|orders|products)$")
    month: Optional[int] = Field(None, ge=1, le=12)
    year: Optional[int] = Field(None, ge=2020, le=2100)
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    format: str = Field("csv", pattern="^(csv|xlsx)$")


@router.post("/export")
async def export_report(
    body: ExportRequest,
    current_user=Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR])),
    db: AsyncSession = Depends(get_db),
):
    """Generate CSV/Excel export for a report type. Returns download URL."""
    # Determine period
    if body.month and body.year:
        period_start, period_end = _parse_period(body.month, body.year)
    elif body.from_date and body.to_date:
        period_start = body.from_date
        period_end = body.to_date
    else:
        raise HTTPException(400, "Cần month+year hoặc from_date+to_date")

    # In production: generate file async via Celery, upload to S3
    file_name = f"{body.report_type}_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}.{body.format}"
    file_url = f"/exports/{file_name}"

    # Create report record
    report_data = {
        "report_type": body.report_type,
        "format": body.format,
        "requested_by": str(current_user.id),
    }
    sha = _compute_sha256(str(report_data))

    report = ComplianceReport(
        report_type=body.report_type,
        period_start=period_start,
        period_end=period_end,
        data=report_data,
        generated_by=current_user.id,
        file_url=file_url,
        sha256_hash=sha,
    )
    db.add(report)
    await db.commit()

    return {
        "report_id": str(report.id),
        "report_type": body.report_type,
        "format": body.format,
        "file_url": file_url,
        "sha256_hash": sha,
        "status": "generating",
        "message": "File sẽ sẵn sàng trong vài phút",
    }


# ── ATTP Compliance Check ────────────────────────────────────

REQUIRED_CERTS = ["attp", "gmp"]  # Minimum required for supplements


@router.get("/attp-check/{product_id}")
async def attp_check(
    product_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """ATTP compliance check for supplements. Verify certifications exist and are valid."""
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ATTPCertification).where(ATTPCertification.product_id == product_id)
    )
    certs = result.scalars().all()

    cert_map = {}
    issues = []
    for cert in certs:
        cert_map[cert.cert_type] = {
            "id": str(cert.id),
            "cert_type": cert.cert_type,
            "cert_number": cert.cert_number,
            "issuer": cert.issuer,
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
            "expires_at": cert.expires_at.isoformat() if cert.expires_at else None,
            "status": cert.status,
            "document_url": cert.document_url,
        }
        # Check expiry
        if cert.expires_at and cert.expires_at.replace(tzinfo=timezone.utc) < now:
            issues.append(f"Chứng nhận {cert.cert_type} ({cert.cert_number}) đã hết hạn")
        if cert.status == CertStatus.REVOKED:
            issues.append(f"Chứng nhận {cert.cert_type} ({cert.cert_number}) đã bị thu hồi")

    # Check required certs
    missing = []
    for req in REQUIRED_CERTS:
        if req not in cert_map:
            missing.append(req)

    is_compliant = len(missing) == 0 and len(issues) == 0

    return {
        "product_id": str(product_id),
        "is_compliant": is_compliant,
        "certifications": cert_map,
        "missing_certifications": missing,
        "issues": issues,
        "checked_at": now.isoformat(),
    }


# ── Blockchain Proof ─────────────────────────────────────────

@router.get("/blockchain-proof")
async def blockchain_proof(
    entity_type: str = Query(..., regex="^(order|commission|report)$"),
    entity_id: uuid.UUID = Query(...),
    *,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """On-chain audit hash verification: compare stored vs computed hash."""
    stored_hash = None
    computed_hash = None
    tx_hash = None

    if entity_type == "order":
        result = await db.execute(select(Order).where(Order.id == entity_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(404, "Order không tồn tại")
        record_str = f"{order.id}|{order.order_number}|{order.status}|{order.total}|{order.created_at}"
        computed_hash = _compute_sha256(record_str)
        tx_hash = order.payment_tx_id

    elif entity_type == "commission":
        result = await db.execute(select(Commission).where(Commission.id == entity_id))
        comm = result.scalar_one_or_none()
        if not comm:
            raise HTTPException(404, "Commission không tồn tại")
        record_str = f"{comm.id}|{comm.order_id}|{comm.koc_id}|{comm.amount}|{comm.status}|{comm.created_at}"
        computed_hash = _compute_sha256(record_str)
        stored_hash = None  # Stored on-chain via tx_hash
        tx_hash = comm.tx_hash

    elif entity_type == "report":
        result = await db.execute(
            select(ComplianceReport).where(ComplianceReport.id == entity_id)
        )
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(404, "Report không tồn tại")
        stored_hash = report.sha256_hash
        computed_hash = _compute_sha256(str(report.data))
        tx_hash = report.blockchain_tx_hash

    match = stored_hash == computed_hash if stored_hash else None

    return {
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "stored_hash": stored_hash,
        "computed_hash": computed_hash,
        "blockchain_tx_hash": tx_hash,
        "match": match,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }
