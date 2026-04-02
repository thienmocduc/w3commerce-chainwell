"""
WellKOC — DPP NFT Minting Worker
Celery task that simulates on-chain DPP minting on Polygon.
In production: calls DPPFactory.mintDPP() smart contract.
"""
import asyncio
import hashlib
import json
import logging
import time
from uuid import UUID

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="app.workers.dpp_worker.mint_dpp_nft",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="blockchain",
)
def mint_dpp_nft(self, product_id: str, metadata: dict) -> dict:
    """
    Mint a DPP NFT for a product.

    For now: simulates minting by generating mock tx_hash and token_id.
    In production: calls DPPFactory.mintDPP(tokenURI) on Polygon.

    Steps:
    1. Build metadata JSON
    2. Simulate IPFS upload (generate fake IPFS hash)
    3. Simulate on-chain minting (generate mock tx_hash + token_id)
    4. Update product record and DPP record with NFT data
    """

    async def _mint():
        from sqlalchemy import select
        from app.core.database import async_session
        from app.models.product import Product
        from app.models.dpp_nft import DPPRecord

        async with async_session() as db:
            # Load product
            result = await db.execute(
                select(Product).where(Product.id == UUID(product_id))
            )
            product = result.scalar_one_or_none()
            if not product:
                logger.error(f"Product {product_id} not found for DPP minting")
                return {"error": "Product not found", "product_id": product_id}

            # ── Step 1: Build metadata JSON ──────────────────────
            dpp_metadata = {
                "name": product.name,
                "description": f"Digital Product Passport for {product.name}",
                "manufacturer": product.manufacturer or "Unknown",
                "origin_country": product.origin_country or "VN",
                "certifications": product.certifications or [],
                "lot_number": product.lot_number,
                "manufacture_date": (
                    product.manufacture_date.isoformat()
                    if product.manufacture_date
                    else None
                ),
                "expiry_date": (
                    product.expiry_date.isoformat()
                    if product.expiry_date
                    else None
                ),
                "category": product.category,
                "sku": product.sku,
                # Merge any extra metadata passed from the caller
                **metadata,
            }

            # ── Step 2: Simulate IPFS upload ─────────────────────
            # In production: pin to IPFS via Pinata/Infura and get real CID
            metadata_json = json.dumps(dpp_metadata, sort_keys=True, default=str)
            ipfs_hash = "Qm" + hashlib.sha256(metadata_json.encode()).hexdigest()[:44]
            ipfs_uri = f"ipfs://{ipfs_hash}"

            logger.info(f"Simulated IPFS upload for product {product_id}: {ipfs_uri}")

            # ── Step 3: Simulate on-chain minting ────────────────
            # In production: call DPPFactory.mintDPP(ipfs_uri) on Polygon
            # Generate deterministic but unique mock values
            seed = f"{product_id}:{time.time()}"
            tx_hash = "0x" + hashlib.sha256(seed.encode()).hexdigest()
            token_id = int(hashlib.sha256(product_id.encode()).hexdigest()[:8], 16) % 1_000_000

            logger.info(
                f"Simulated DPP mint: token_id={token_id}, tx_hash={tx_hash[:18]}..."
            )

            # ── Step 4: Update product record ────────────────────
            product.dpp_verified = True
            product.dpp_nft_token_id = token_id
            product.dpp_ipfs_uri = ipfs_uri
            product.dpp_tx_hash = tx_hash
            db.add(product)

            # ── Step 5: Create/update DPP record ─────────────────
            existing_dpp = await db.execute(
                select(DPPRecord).where(DPPRecord.product_id == UUID(product_id))
            )
            dpp_record = existing_dpp.scalar_one_or_none()

            if dpp_record:
                dpp_record.token_id = token_id
                dpp_record.ipfs_uri = ipfs_uri
                dpp_record.tx_hash = tx_hash
                dpp_record.nft_metadata = dpp_metadata
                dpp_record.is_active = True
                from datetime import datetime
                dpp_record.minted_at = datetime.utcnow()
            else:
                from datetime import datetime
                dpp_record = DPPRecord(
                    product_id=UUID(product_id),
                    token_id=token_id,
                    ipfs_uri=ipfs_uri,
                    tx_hash=tx_hash,
                    metadata=dpp_metadata,
                    is_active=True,
                    minted_at=datetime.utcnow(),
                )
                db.add(dpp_record)

            await db.commit()

            logger.info(f"DPP NFT minted for product {product_id}: token={token_id}")

            return {
                "product_id": product_id,
                "token_id": token_id,
                "tx_hash": tx_hash,
                "ipfs_uri": ipfs_uri,
                "status": "minted",
            }

    try:
        return asyncio.run(_mint())
    except Exception as exc:
        logger.error(f"DPP minting failed for {product_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
