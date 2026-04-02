"""WellKOC — DPP NFT Service"""
import json
import hashlib
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product
from app.models.dpp_nft import DPPRecord


class DPPService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def mint_async(self, product_id: UUID, extra_metadata: dict = None) -> str:
        """
        Trigger DPP NFT minting via Celery.

        1. Build metadata JSON from product record
        2. Simulate IPFS upload (generate fake IPFS hash for now)
        3. Queue a Celery task for on-chain minting
        4. Return the Celery task ID for job tracking
        """
        # Load product to build metadata
        result = await self.db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        # Build metadata for the DPP NFT
        metadata = {
            "product_name": product.name,
            "origin_country": product.origin_country or "VN",
            "certifications": product.certifications or [],
            "manufacturer": product.manufacturer or "Unknown",
            "lot_number": product.lot_number,
            "category": product.category,
            "sku": product.sku,
        }
        if extra_metadata:
            metadata.update(extra_metadata)

        # Simulate IPFS upload: store metadata as JSON, generate fake IPFS hash
        metadata_json = json.dumps(metadata, sort_keys=True, default=str)
        ipfs_hash = "Qm" + hashlib.sha256(metadata_json.encode()).hexdigest()[:44]

        # Queue Celery task for on-chain minting
        from app.workers.dpp_worker import mint_dpp_nft

        task = mint_dpp_nft.apply_async(
            args=[str(product_id), metadata],
            queue="blockchain",
        )

        return task.id

    async def get_dpp_record(self, product_id: UUID) -> dict | None:
        """Get DPP record for a product."""
        result = await self.db.execute(
            select(DPPRecord).where(DPPRecord.product_id == product_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            return None
        return {
            "id": str(record.id),
            "product_id": str(record.product_id),
            "token_id": record.token_id,
            "ipfs_uri": record.ipfs_uri,
            "tx_hash": record.tx_hash,
            "metadata": record.nft_metadata,
            "scan_count": record.scan_count,
            "is_active": record.is_active,
            "minted_at": record.minted_at.isoformat() if record.minted_at else None,
            "created_at": record.created_at.isoformat(),
        }

    async def verify_token(self, token_id: int) -> dict | None:
        """Verify a DPP token and return its real metadata."""
        result = await self.db.execute(
            select(DPPRecord).where(DPPRecord.token_id == token_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            return None

        # Increment scan count
        record.scan_count += 1
        self.db.add(record)

        # Load associated product
        product_result = await self.db.execute(
            select(Product).where(Product.id == record.product_id)
        )
        product = product_result.scalar_one_or_none()

        return {
            "verified": True,
            "token_id": token_id,
            "dpp_record": {
                "id": str(record.id),
                "ipfs_uri": record.ipfs_uri,
                "tx_hash": record.tx_hash,
                "metadata": record.nft_metadata,
                "minted_at": record.minted_at.isoformat() if record.minted_at else None,
                "scan_count": record.scan_count,
            },
            "product": {
                "id": str(product.id),
                "name": product.name,
                "manufacturer": product.manufacturer,
                "origin_country": product.origin_country,
                "certifications": product.certifications,
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
            } if product else None,
            "blockchain": {
                "network": "Polygon",
                "contract": "0xDPP...",
                "tx_hash": record.tx_hash,
                "ipfs_uri": record.ipfs_uri,
            },
        }
