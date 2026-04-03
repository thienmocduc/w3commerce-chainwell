"""
WellKOC — Async SQLAlchemy Database Configuration
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

# ── Engine ──────────────────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DB_ECHO,
    future=True,
    poolclass=NullPool if settings.APP_ENV == "test" else None,
)

# ── Session factory ─────────────────────────────────────────
async_session: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Base model class ────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Lifecycle ───────────────────────────────────────────────
async def init_db() -> None:
    """Import all models before creating tables"""
    from app.models import (  # noqa: F401
        user, product, order, cart, review,
        koc_profile, vendor, shipment, dpp_nft, membership,
        return_request, group_buy, live_stream, social,
        pool_ranking, flash_sale,
        recommendation, social_comment, coaching_report,
        publish_job, fraud,
        shopping_event, compliance, analytics, gamification,
    )
    async with engine.begin() as conn:
        # Only create tables in dev; use Alembic in production
        if settings.is_development:
            await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()


# ── Dependency injection ─────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
