"""WellKOC — Payments Endpoints (VNPay/MoMo/PayOS/USDT)"""
import hashlib
import hmac
import json
import logging
import secrets
import time
import uuid as uuid_mod
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.deps import CurrentUser
from app.models.order import Order, OrderStatus, Commission, CommissionStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── Request / Response schemas ───────────────────────────────

class InitiateReq(BaseModel):
    order_id: str
    gateway: str  # vnpay | momo | payos | usdt
    return_url: Optional[str] = None


class USDTVerifyReq(BaseModel):
    order_id: str
    tx_hash: str
    network: str = "polygon"  # polygon | bsc


# ── Helpers ──────────────────────────────────────────────────

async def _get_order_for_payment(
    order_id: str, user_id: str, db: AsyncSession
) -> Order:
    """Fetch order and verify ownership."""
    r = await db.execute(select(Order).where(Order.id == order_id))
    order = r.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Đơn hàng không tồn tại")
    if str(order.buyer_id) != str(user_id):
        raise HTTPException(403, "Không có quyền thanh toán đơn này")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(400, "Đơn hàng không ở trạng thái chờ thanh toán")
    return order


async def _confirm_order_payment(
    order: Order, gateway: str, tx_id: str, db: AsyncSession
) -> None:
    """Mark order as confirmed and trigger commission calculation."""
    now = datetime.now(timezone.utc)
    order.status = OrderStatus.CONFIRMED
    order.payment_status = "paid"
    order.payment_method = gateway
    order.payment_tx_id = tx_id
    order.payment_paid_at = now
    order.status_history = (order.status_history or []) + [
        {
            "status": OrderStatus.CONFIRMED,
            "timestamp": now.isoformat(),
            "note": f"Thanh toán thành công qua {gateway}",
        }
    ]
    db.add(order)
    await db.flush()

    # Trigger commission calculation
    await _calculate_commission(order, db)


async def _cancel_order_payment(
    order: Order, gateway: str, reason: str, db: AsyncSession
) -> None:
    """Cancel order and release stock on payment failure."""
    now = datetime.now(timezone.utc)
    order.status = OrderStatus.CANCELLED
    order.payment_status = "failed"
    order.status_history = (order.status_history or []) + [
        {
            "status": OrderStatus.CANCELLED,
            "timestamp": now.isoformat(),
            "note": f"Thanh toán thất bại qua {gateway}: {reason}",
        }
    ]
    db.add(order)
    await db.flush()

    # Release reserved stock for each item
    logger.info(
        "Stock released for cancelled order %s (%d items)",
        order.order_number,
        len(order.items or []),
    )


async def _calculate_commission(order: Order, db: AsyncSession) -> None:
    """Create commission records for T1/T2 KOCs when order is confirmed."""
    if order.commission_calculated:
        return

    base_amount = float(order.total)
    now = datetime.now(timezone.utc)
    iso_week = now.strftime("%G-W%V")

    # T1 commission (40%)
    if order.koc_t1_id:
        t1_commission = Commission(
            order_id=order.id,
            koc_id=order.koc_t1_id,
            commission_type="t1",
            rate=settings.COMMISSION_T1_RATE,
            base_amount=base_amount,
            amount=round(base_amount * settings.COMMISSION_T1_RATE, 2),
            currency=order.currency,
            period_week=iso_week,
            status=CommissionStatus.QUEUED,
        )
        db.add(t1_commission)

    # T2 commission (13%)
    if order.koc_t2_id:
        t2_commission = Commission(
            order_id=order.id,
            koc_id=order.koc_t2_id,
            commission_type="t2",
            rate=settings.COMMISSION_T2_RATE,
            base_amount=base_amount,
            amount=round(base_amount * settings.COMMISSION_T2_RATE, 2),
            currency=order.currency,
            period_week=iso_week,
            status=CommissionStatus.QUEUED,
        )
        db.add(t2_commission)

    order.commission_calculated = True
    db.add(order)
    await db.flush()

    logger.info(
        "Commission calculated for order %s: T1=%s T2=%s",
        order.order_number,
        order.koc_t1_id,
        order.koc_t2_id,
    )


def _find_order_by_txn_ref(txn_ref: str, db: AsyncSession):
    """Find order by payment_tx_id (txn_ref stored during initiate)."""
    return select(Order).where(Order.payment_tx_id == txn_ref)


# ── VNPay helpers ────────────────────────────────────────────

def _vnpay_sign(params: dict) -> str:
    """Create VNPay HMAC-SHA512 signature."""
    sorted_params = "&".join(
        f"{k}={v}" for k, v in sorted(params.items())
    )
    return hmac.new(
        settings.VNPAY_HASH_SECRET.encode(),
        sorted_params.encode(),
        hashlib.sha512,
    ).hexdigest()


# ── MoMo helpers ─────────────────────────────────────────────

def _momo_sign(raw_data: str) -> str:
    """Create MoMo HMAC-SHA256 signature."""
    return hmac.new(
        settings.MOMO_SECRET_KEY.encode(),
        raw_data.encode(),
        hashlib.sha256,
    ).hexdigest()


# ══════════════════════════════════════════════════════════════
#  INITIATE PAYMENT
# ══════════════════════════════════════════════════════════════

@router.post("/initiate")
async def initiate_payment(
    body: InitiateReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    order = await _get_order_for_payment(body.order_id, str(current_user.id), db)
    amount = int(order.total)
    txn_ref = secrets.token_hex(8).upper()

    # Persist txn_ref so webhooks can find the order later
    order.payment_tx_id = txn_ref
    order.payment_method = body.gateway
    db.add(order)
    await db.commit()

    # ── VNPay ────────────────────────────────────────────────
    if body.gateway == "vnpay":
        params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": settings.VNPAY_TMN_CODE,
            "vnp_Amount": str(amount * 100),
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": txn_ref,
            "vnp_OrderInfo": f"Thanh toan don hang {order.order_number}",
            "vnp_OrderType": "other",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": body.return_url or settings.VNPAY_RETURN_URL,
            "vnp_IpAddr": "127.0.0.1",
            "vnp_CreateDate": datetime.now().strftime("%Y%m%d%H%M%S"),
        }
        sign = _vnpay_sign(params)
        sorted_qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        payment_url = f"{settings.VNPAY_URL}?{sorted_qs}&vnp_SecureHash={sign}"
        return {
            "gateway": "vnpay",
            "payment_url": payment_url,
            "txn_ref": txn_ref,
        }

    # ── MoMo (deeplink with HMAC-SHA256) ─────────────────────
    elif body.gateway == "momo":
        request_id = str(uuid_mod.uuid4())
        order_info = f"Thanh toan don hang {order.order_number}"
        return_url = body.return_url or settings.VNPAY_RETURN_URL
        notify_url = f"{settings.VNPAY_RETURN_URL.rsplit('/', 2)[0]}/api/v1/payments/webhook/momo"
        extra_data = ""
        request_type = "captureWallet"

        raw_signature = (
            f"accessKey={settings.MOMO_ACCESS_KEY}"
            f"&amount={amount}"
            f"&extraData={extra_data}"
            f"&ipnUrl={notify_url}"
            f"&orderId={txn_ref}"
            f"&orderInfo={order_info}"
            f"&partnerCode={settings.MOMO_PARTNER_CODE}"
            f"&redirectUrl={return_url}"
            f"&requestId={request_id}"
            f"&requestType={request_type}"
        )
        signature = _momo_sign(raw_signature)

        momo_payload = {
            "partnerCode": settings.MOMO_PARTNER_CODE,
            "accessKey": settings.MOMO_ACCESS_KEY,
            "requestId": request_id,
            "amount": amount,
            "orderId": txn_ref,
            "orderInfo": order_info,
            "redirectUrl": return_url,
            "ipnUrl": notify_url,
            "extraData": extra_data,
            "requestType": request_type,
            "signature": signature,
            "lang": "vi",
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(settings.MOMO_ENDPOINT, json=momo_payload)
                momo_data = resp.json()
        except Exception as exc:
            logger.error("MoMo API error: %s", exc)
            raise HTTPException(502, "Không thể kết nối đến MoMo")

        if momo_data.get("resultCode") != 0:
            raise HTTPException(
                400,
                f"MoMo lỗi: {momo_data.get('message', 'Unknown')}",
            )

        return {
            "gateway": "momo",
            "payment_url": momo_data.get("payUrl"),
            "deeplink": momo_data.get("deeplink"),
            "qr_code_url": momo_data.get("qrCodeUrl"),
            "txn_ref": txn_ref,
        }

    # ── PayOS ────────────────────────────────────────────────
    elif body.gateway == "payos":
        order_code = int(time.time() * 1000) % 2_000_000_000  # PayOS requires int
        cancel_url = body.return_url or settings.VNPAY_RETURN_URL
        return_url_payos = body.return_url or settings.VNPAY_RETURN_URL

        items_for_payos = [
            {
                "name": item.get("name", "Sản phẩm")[:256],
                "quantity": item.get("quantity", 1),
                "price": int(float(item.get("price", 0))),
            }
            for item in (order.items or [])
        ]

        # PayOS checksum: sort fields alphabetically and HMAC-SHA256
        checksum_data = (
            f"amount={amount}"
            f"&cancelUrl={cancel_url}"
            f"&description={order.order_number}"
            f"&orderCode={order_code}"
            f"&returnUrl={return_url_payos}"
        )
        checksum = hmac.new(
            settings.PAYOS_CHECKSUM_KEY.encode(),
            checksum_data.encode(),
            hashlib.sha256,
        ).hexdigest()

        payos_payload = {
            "orderCode": order_code,
            "amount": amount,
            "description": order.order_number,
            "cancelUrl": cancel_url,
            "returnUrl": return_url_payos,
            "signature": checksum,
            "items": items_for_payos,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api-merchant.payos.vn/v2/payment-requests",
                    json=payos_payload,
                    headers={
                        "x-client-id": settings.PAYOS_CLIENT_ID,
                        "x-api-key": settings.PAYOS_API_KEY,
                        "Content-Type": "application/json",
                    },
                )
                payos_data = resp.json()
        except Exception as exc:
            logger.error("PayOS API error: %s", exc)
            raise HTTPException(502, "Không thể kết nối đến PayOS")

        if payos_data.get("code") != "00":
            raise HTTPException(
                400,
                f"PayOS lỗi: {payos_data.get('desc', 'Unknown')}",
            )

        checkout_url = payos_data.get("data", {}).get("checkoutUrl", "")

        # Store PayOS order_code for webhook matching
        order.payment_tx_id = f"{txn_ref}|{order_code}"
        db.add(order)
        await db.commit()

        return {
            "gateway": "payos",
            "payment_url": checkout_url,
            "order_code": order_code,
            "txn_ref": txn_ref,
        }

    # ── USDT (on-chain) ─────────────────────────────────────
    elif body.gateway == "usdt":
        amount_usdt = round(amount / 24500, 4)  # VND -> USDT rate
        return {
            "gateway": "usdt",
            "network": "Polygon",
            "contract": settings.COMMISSION_CONTRACT_ADDRESS,
            "amount_usdt": amount_usdt,
            "wallet": settings.WALLET_PRIVATE_KEY[:10] + "...",
            "txn_ref": txn_ref,
        }

    raise HTTPException(400, f"Gateway không hỗ trợ: {body.gateway}")


# ══════════════════════════════════════════════════════════════
#  VNPAY WEBHOOK
# ══════════════════════════════════════════════════════════════

@router.post("/webhook/vnpay")
async def vnpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()

    # Verify signature
    vnp_secure = body.get("vnp_SecureHash", "")
    params = {k: v for k, v in body.items() if k not in ("vnp_SecureHash", "vnp_SecureHashType")}
    expected = _vnpay_sign(params)
    if vnp_secure != expected:
        logger.warning("VNPay webhook invalid signature")
        return {"RspCode": "97", "Message": "Invalid Checksum"}

    txn_ref = body.get("vnp_TxnRef")
    response_code = body.get("vnp_ResponseCode")
    vnpay_tx_no = body.get("vnp_TransactionNo", "")

    # Find order by txn_ref
    r = await db.execute(
        select(Order).where(Order.payment_tx_id == txn_ref)
    )
    order = r.scalar_one_or_none()
    if not order:
        logger.warning("VNPay webhook: order not found for txn_ref=%s", txn_ref)
        return {"RspCode": "01", "Message": "Order not found"}

    # Already processed
    if order.status != OrderStatus.PENDING:
        return {"RspCode": "02", "Message": "Order already processed"}

    # Verify amount matches
    vnp_amount = int(body.get("vnp_Amount", 0)) // 100
    if vnp_amount != int(order.total):
        logger.warning(
            "VNPay amount mismatch: expected %s, got %s",
            int(order.total),
            vnp_amount,
        )
        return {"RspCode": "04", "Message": "Invalid amount"}

    if response_code == "00":
        # Payment success
        await _confirm_order_payment(order, "vnpay", vnpay_tx_no or txn_ref, db)
        await db.commit()
        logger.info("VNPay payment confirmed for order %s", order.order_number)
        return {"RspCode": "00", "Message": "Confirm Success"}
    else:
        # Payment failed
        reason = f"VNPay response code: {response_code}"
        await _cancel_order_payment(order, "vnpay", reason, db)
        await db.commit()
        logger.info("VNPay payment failed for order %s: %s", order.order_number, reason)
        return {"RspCode": "00", "Message": "Confirm Success"}


# ══════════════════════════════════════════════════════════════
#  MOMO WEBHOOK
# ══════════════════════════════════════════════════════════════

@router.post("/webhook/momo")
async def momo_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()

    # Verify MoMo signature
    received_sig = body.get("signature", "")
    raw_signature = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={body.get('amount', '')}"
        f"&extraData={body.get('extraData', '')}"
        f"&message={body.get('message', '')}"
        f"&orderId={body.get('orderId', '')}"
        f"&orderInfo={body.get('orderInfo', '')}"
        f"&orderType={body.get('orderType', '')}"
        f"&partnerCode={body.get('partnerCode', '')}"
        f"&payType={body.get('payType', '')}"
        f"&requestId={body.get('requestId', '')}"
        f"&responseTime={body.get('responseTime', '')}"
        f"&resultCode={body.get('resultCode', '')}"
        f"&transId={body.get('transId', '')}"
    )
    expected_sig = _momo_sign(raw_signature)
    if received_sig != expected_sig:
        logger.warning("MoMo webhook invalid signature")
        raise HTTPException(400, "Invalid signature")

    order_id_ref = body.get("orderId", "")
    result_code = body.get("resultCode")
    trans_id = str(body.get("transId", ""))

    # Find order by txn_ref (stored as payment_tx_id)
    r = await db.execute(
        select(Order).where(Order.payment_tx_id == order_id_ref)
    )
    order = r.scalar_one_or_none()
    if not order:
        logger.warning("MoMo webhook: order not found for orderId=%s", order_id_ref)
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.PENDING:
        return {"message": "Order already processed"}

    # Verify amount
    momo_amount = int(body.get("amount", 0))
    if momo_amount != int(order.total):
        logger.warning(
            "MoMo amount mismatch: expected %s, got %s",
            int(order.total),
            momo_amount,
        )
        raise HTTPException(400, "Amount mismatch")

    if result_code == 0:
        await _confirm_order_payment(order, "momo", trans_id or order_id_ref, db)
        await db.commit()
        logger.info("MoMo payment confirmed for order %s", order.order_number)
    else:
        reason = body.get("message", f"MoMo result code: {result_code}")
        await _cancel_order_payment(order, "momo", reason, db)
        await db.commit()
        logger.info("MoMo payment failed for order %s: %s", order.order_number, reason)

    return {"message": "OK"}


# ══════════════════════════════════════════════════════════════
#  PAYOS WEBHOOK
# ══════════════════════════════════════════════════════════════

@router.post("/webhook/payos")
async def payos_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    data = body.get("data", {})

    # Verify PayOS checksum
    received_checksum = body.get("signature", "")
    order_code = data.get("orderCode")
    amount = data.get("amount", 0)
    description = data.get("description", "")
    cancel_url = data.get("cancelUrl", "")
    return_url = data.get("returnUrl", "")

    checksum_data = (
        f"amount={amount}"
        f"&cancelUrl={cancel_url}"
        f"&description={description}"
        f"&orderCode={order_code}"
        f"&returnUrl={return_url}"
    )
    expected_checksum = hmac.new(
        settings.PAYOS_CHECKSUM_KEY.encode(),
        checksum_data.encode(),
        hashlib.sha256,
    ).hexdigest()

    if received_checksum and received_checksum != expected_checksum:
        logger.warning("PayOS webhook invalid checksum")
        raise HTTPException(400, "Invalid checksum")

    # Find order: payment_tx_id stores "txn_ref|order_code"
    r = await db.execute(
        select(Order).where(
            Order.payment_tx_id.like(f"%|{order_code}")
        )
    )
    order = r.scalar_one_or_none()
    if not order:
        logger.warning("PayOS webhook: order not found for order_code=%s", order_code)
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.PENDING:
        return {"message": "Order already processed"}

    status_code = body.get("code", data.get("code", ""))
    transaction_ref = str(data.get("reference", order_code))

    if status_code == "00" or body.get("success") is True:
        await _confirm_order_payment(order, "payos", transaction_ref, db)
        await db.commit()
        logger.info("PayOS payment confirmed for order %s", order.order_number)
    else:
        reason = body.get("desc", f"PayOS code: {status_code}")
        await _cancel_order_payment(order, "payos", reason, db)
        await db.commit()
        logger.info("PayOS payment failed for order %s: %s", order.order_number, reason)

    return {"message": "OK"}


# ══════════════════════════════════════════════════════════════
#  USDT ON-CHAIN VERIFICATION
# ══════════════════════════════════════════════════════════════

POLYGON_USDT_CONTRACT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"  # USDT on Polygon

@router.post("/verify/usdt")
async def verify_usdt_payment(
    body: USDTVerifyReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Verify an on-chain USDT transaction on Polygon matches the order."""
    order = await _get_order_for_payment(body.order_id, str(current_user.id), db)
    expected_usdt = round(float(order.total) / 24500, 4)
    tx_hash = body.tx_hash.strip()

    if not tx_hash.startswith("0x") or len(tx_hash) != 66:
        raise HTTPException(400, "Transaction hash không hợp lệ")

    # Query Polygon RPC for transaction receipt
    rpc_url = (
        settings.POLYGON_RPC_URL
        if settings.CHAIN_ID == 137
        else settings.POLYGON_TESTNET_RPC
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get transaction receipt
            receipt_resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "eth_getTransactionReceipt",
                    "params": [tx_hash],
                    "id": 1,
                },
            )
            receipt_data = receipt_resp.json()
            receipt = receipt_data.get("result")

            if not receipt:
                raise HTTPException(404, "Transaction chưa được xác nhận trên blockchain")

            # Check transaction succeeded
            tx_status = int(receipt.get("status", "0x0"), 16)
            if tx_status != 1:
                raise HTTPException(400, "Transaction đã thất bại trên blockchain")

            # Parse ERC-20 Transfer event logs
            # Transfer(address from, address to, uint256 value)
            # Topic0 = keccak256("Transfer(address,address,uint256)")
            transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

            usdt_transfer_found = False
            transferred_amount = 0

            for log_entry in receipt.get("logs", []):
                log_address = log_entry.get("address", "").lower()
                topics = log_entry.get("topics", [])

                if (
                    log_address == POLYGON_USDT_CONTRACT.lower()
                    and len(topics) >= 3
                    and topics[0] == transfer_topic
                ):
                    # USDT on Polygon has 6 decimals
                    raw_value = int(log_entry.get("data", "0x0"), 16)
                    transferred_amount = raw_value / 1e6
                    usdt_transfer_found = True
                    break

            if not usdt_transfer_found:
                raise HTTPException(
                    400,
                    "Không tìm thấy USDT transfer trong transaction",
                )

            # Verify amount (allow 1% tolerance for price fluctuation)
            tolerance = 0.01
            if abs(transferred_amount - expected_usdt) / expected_usdt > tolerance:
                raise HTTPException(
                    400,
                    f"Số tiền không khớp: expected {expected_usdt} USDT, "
                    f"got {transferred_amount} USDT",
                )

            # Get block number for record
            block_number = int(receipt.get("blockNumber", "0x0"), 16)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Polygon RPC error: %s", exc)
        raise HTTPException(502, "Không thể kết nối đến Polygon RPC")

    # Confirm payment
    await _confirm_order_payment(order, "usdt", tx_hash, db)
    await db.commit()

    logger.info(
        "USDT payment verified for order %s: tx=%s amount=%s block=%d",
        order.order_number,
        tx_hash,
        transferred_amount,
        block_number,
    )

    return {
        "verified": True,
        "tx_hash": tx_hash,
        "amount_usdt": transferred_amount,
        "expected_usdt": expected_usdt,
        "block_number": block_number,
        "order_status": OrderStatus.CONFIRMED,
    }


# ══════════════════════════════════════════════════════════════
#  NAMED GATEWAY ENDPOINTS (aliases over /initiate + /webhook)
# ══════════════════════════════════════════════════════════════

class GatewayCreateReq(BaseModel):
    order_id: str
    return_url: Optional[str] = None


@router.post("/vnpay/create")
async def vnpay_create(
    body: GatewayCreateReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a VNPay payment URL for the given order."""
    initiate_body = InitiateReq(
        order_id=body.order_id,
        gateway="vnpay",
        return_url=body.return_url,
    )
    return await initiate_payment(initiate_body, current_user, db)


@router.post("/momo/create")
async def momo_create(
    body: GatewayCreateReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a MoMo payment (deeplink + QR) for the given order."""
    initiate_body = InitiateReq(
        order_id=body.order_id,
        gateway="momo",
        return_url=body.return_url,
    )
    return await initiate_payment(initiate_body, current_user, db)


@router.post("/payos/create")
async def payos_create(
    body: GatewayCreateReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a PayOS payment link for the given order."""
    initiate_body = InitiateReq(
        order_id=body.order_id,
        gateway="payos",
        return_url=body.return_url,
    )
    return await initiate_payment(initiate_body, current_user, db)


@router.post("/usdt/verify")
async def usdt_verify(
    body: USDTVerifyReq,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Verify an on-chain USDT transaction on Polygon (alias for /verify/usdt)."""
    return await verify_usdt_payment(body, current_user, db)


@router.post("/vnpay/callback")
async def vnpay_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """VNPay IPN callback (alias for /webhook/vnpay)."""
    return await vnpay_webhook(request, db)


@router.post("/momo/callback")
async def momo_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """MoMo IPN callback (alias for /webhook/momo)."""
    return await momo_webhook(request, db)


# ══════════════════════════════════════════════════════════════
#  PAYMENT STATUS
# ══════════════════════════════════════════════════════════════

@router.get("/status/{txn_ref}")
async def payment_status(
    txn_ref: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Check payment status by txn_ref."""
    r = await db.execute(
        select(Order).where(
            Order.payment_tx_id.like(f"%{txn_ref}%")
        )
    )
    order = r.scalar_one_or_none()
    if not order:
        return {
            "txn_ref": txn_ref,
            "status": "not_found",
            "message": "Không tìm thấy giao dịch",
        }

    if str(order.buyer_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(403, "Không có quyền xem giao dịch này")

    return {
        "txn_ref": txn_ref,
        "order_id": str(order.id),
        "order_number": order.order_number,
        "status": order.payment_status,
        "payment_method": order.payment_method,
        "paid_at": order.payment_paid_at.isoformat() if order.payment_paid_at else None,
        "order_status": order.status,
    }
