import asyncpg
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool = None


async def init_db():
    global _pool
    try:
        url = settings.DATABASE_URL
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        url = url.replace("postgres://", "postgresql://")

        _pool = await asyncpg.create_pool(
            url,
            min_size=2,
            max_size=settings.DB_POOL_SIZE + settings.DB_MAX_OVERFLOW,
            command_timeout=60,
        )
        async with _pool.acquire() as conn:
            await conn.execute("SELECT 1")
        logger.info("✅ Base de données initialisée")
    except Exception as e:
        logger.error(f"❌ Erreur init DB: {e}")
        raise


async def get_db():
    if _pool is None:
        raise RuntimeError("Pool DB non initialisé")
    async with _pool.acquire() as conn:
        yield conn
