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
    """Import all models to register them with SQLAlchemy metadata.
    In development: auto-creates tables via create_all.
    In production: use Alembic migrations; no DB connection needed here.
    """
    from app.models import (  # noqa: F401
        user, product, order, cart, review,
        koc_profile, vendor, shipment, dpp_nft, membership,
        return_request, group_buy, live_stream, social,
        pool_ranking, flash_sale,
        recommendation, social_comment, coaching_report,
        publish_job, fraud,
        shopping_event, compliance, analytics, gamification,
    )
    # Only connect to DB in development — production uses Alembic migrations
    if settings.is_development:
        async with engine.begin() as conn:
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
