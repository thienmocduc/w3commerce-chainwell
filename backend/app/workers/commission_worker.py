"""
WellKOC — Commission Settlement Worker
Batches pending commissions → sends to Polygon smart contract
"""
import logging
from typing import List
from uuid import UUID

from celery import shared_task
from web3 import Web3
from web3.middleware import geth_poa_middleware

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Web3 setup ────────────────────────────────────────────────
def get_web3() -> Web3:
    w3 = Web3(Web3.HTTPProvider(
        settings.POLYGON_RPC_URL if settings.is_production else settings.POLYGON_TESTNET_RPC,
        request_kwargs={"timeout": 30},
    ))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
    return w3

# CommissionDistributor ABI (minimal)
DISTRIBUTOR_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"name": "orderId", "type": "bytes32"},
                    {"name": "recipient", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "commType", "type": "uint8"},
                ],
                "name": "records",
                "type": "tuple[]",
            }
        ],
        "name": "batchDistribute",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
]


@shared_task(
    name="app.workers.commission_worker.settle_commissions_batch",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="critical",
)
def settle_commissions_batch(self, commission_ids: List[str]) -> dict:
    """
    Settle a batch of commissions on Polygon.
    Called immediately after order delivery confirmation.
    """
    import asyncio
    from sqlalchemy import select, update
    from app.core.database import async_session
    from app.models.order import Commission, CommissionStatus

    async def _settle():
        async with async_session() as db:
            # Load commissions
            result = await db.execute(
                select(Commission).where(
                    Commission.id.in_([UUID(cid) for cid in commission_ids]),
                    Commission.status == CommissionStatus.QUEUED,
                )
            )
            commissions = result.scalars().all()
            if not commissions:
                logger.info("No pending commissions to settle")
                return {"settled": 0}

            # Mark as settling — commit immediately so no other worker picks these up
            for c in commissions:
                c.status = CommissionStatus.SETTLING
                db.add(c)
            await db.commit()

            # Build contract call
            w3 = get_web3()
            account = w3.eth.account.from_key(settings.WALLET_PRIVATE_KEY)
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(settings.COMMISSION_CONTRACT_ADDRESS),
                abi=DISTRIBUTOR_ABI,
            )

            # Build records for contract
            records = []
            total_amount = 0
            for c in commissions:
                # Get KOC wallet address
                koc_result = await db.execute(
                    select(Commission).where(Commission.id == c.id)
                )
                # We need the KOC wallet address - query from User model
                from app.models.user import User
                user_q = await db.execute(select(User).where(User.id == c.koc_id))
                user = user_q.scalar_one_or_none()
                if not user or not user.wallet_address:
                    logger.warning(f"KOC {c.koc_id} has no wallet, skipping")
                    c.status = CommissionStatus.FAILED
                    c.error_msg = "No wallet address"
                    db.add(c)
                    continue

                # Convert order ID to bytes32
                order_id_hex = '0x' + str(c.order_id).replace('-', '').ljust(64, '0')
                # Convert amount to wei equivalent (assuming MATIC)
                amount_wei = w3.to_wei(c.amount / 1_000_000, 'ether')  # VND to MATIC conversion
                comm_type_map = {'t1': 0, 't2': 1, 'pool_a': 2, 'pool_b': 3, 'pool_c': 4}

                records.append({
                    'orderId': bytes.fromhex(order_id_hex[2:]),
                    'recipient': Web3.to_checksum_address(user.wallet_address),
                    'amount': amount_wei,
                    'commType': comm_type_map.get(c.commission_type, 0),
                })
                total_amount += amount_wei

            if not records:
                return {"settled": 0, "reason": "No valid wallet addresses"}

            # Gas estimation
            gas_price = w3.eth.gas_price
            if gas_price > w3.to_wei(settings.GAS_PRICE_GWEI, 'gwei'):
                logger.warning(f"Gas price too high: {gas_price}, skipping batch")
                return {"settled": 0, "reason": "Gas price too high"}

            # Build & send transaction
            nonce = w3.eth.get_transaction_count(account.address)
            tx = contract.functions.batchDistribute(records).build_transaction({
                'from': account.address,
                'value': total_amount,
                'gas': 500000,
                'gasPrice': gas_price,
                'nonce': nonce,
                'chainId': settings.CHAIN_ID,
            })

            signed = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt.status == 1:
                # Update all commissions as settled — must commit to persist tx_hash/block data
                for c in commissions:
                    c.status = CommissionStatus.SETTLED
                    c.tx_hash = tx_hash.hex()
                    c.block_number = receipt.blockNumber
                    c.gas_used = receipt.gasUsed
                    db.add(c)
                await db.commit()
                logger.info(f"✅ Settled {len(records)} commissions. TX: {tx_hash.hex()}")
                return {"settled": len(records), "tx_hash": tx_hash.hex(), "block": receipt.blockNumber}
            else:
                raise Exception(f"TX reverted: {tx_hash.hex()}")

    try:
        return asyncio.run(_settle())
    except Exception as exc:
        logger.error(f"Commission settlement failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@shared_task(
    name="app.workers.commission_worker.settle_pending_commissions",
    queue="critical",
)
def settle_pending_commissions() -> dict:
    """Scheduled task: collect and batch all QUEUED commissions"""
    import asyncio
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.order import Commission, CommissionStatus

    async def _collect():
        async with async_session() as db:
            result = await db.execute(
                select(Commission.id).where(
                    Commission.status == CommissionStatus.QUEUED
                ).limit(50)
            )
            ids = [str(row[0]) for row in result.all()]
        return ids

    ids = asyncio.run(_collect())
    if ids:
        settle_commissions_batch.apply_async(args=[ids])
        return {"queued_batch": len(ids)}
    return {"queued_batch": 0}


@shared_task(name="app.workers.commission_worker.expire_group_buys", queue="default")
def expire_group_buys() -> dict:
    """Auto-expire group buys that have passed their deadline"""
    import asyncio
    from datetime import datetime, timezone
    from sqlalchemy import select, update
    from app.core.database import async_session

    async def _expire():
        # Implementation: mark expired group buys, trigger refunds
        return {"expired": 0}

    return asyncio.run(_expire())
