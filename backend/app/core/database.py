import asyncpg
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool = None

# Compatibilité avec les imports qui cherchent "engine"
engine = None


async def init_db():
    global _pool, engine
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

        # Test de connexion
        async with _pool.acquire() as conn:
            await conn.execute("SELECT 1")

        # Compatibilité engine
        engine = _pool

        logger.info("✅ Base de données initialisée")

    except Exception as e:
        logger.error(f"❌ Erreur init DB: {e}")
        raise


async def get_db():
    """
    Retourne une connexion asyncpg depuis le pool.
    Utiliser avec : db.fetchrow(), db.fetch(), db.execute()
    Les requêtes utilisent $1, $2 (pas :param)
    """
    if _pool is None:
        raise RuntimeError("Pool DB non initialisé")
    async with _pool.acquire() as conn:
        yield conn


async def close_db():
    """Ferme le pool de connexions proprement"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("✅ Pool DB fermé")


def get_pool() -> asyncpg.Pool:
    """Retourne le pool directement si nécessaire"""
    if _pool is None:
        raise RuntimeError("Pool DB non initialisé")
    return _pool
