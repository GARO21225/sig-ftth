import asyncpg
import asyncio
import logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool = None
engine = None

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


async def _run_sql_file(conn, filepath: Path):
    sql = filepath.read_text(encoding="utf-8")
    await conn.execute(sql)
    logger.info(f"SQL execute : {filepath.name}")


async def _connect_with_retry(url: str, retries: int = 10, delay: float = 3.0):
    """Tente la connexion jusqu'a retries fois, avec delai entre chaque."""
    for attempt in range(1, retries + 1):
        try:
            pool = await asyncpg.create_pool(
                url,
                min_size=2,
                max_size=settings.DB_POOL_SIZE + settings.DB_MAX_OVERFLOW,
                command_timeout=60,
            )
            logger.info(f"Connexion DB etablie (tentative {attempt}/{retries})")
            return pool
        except Exception as e:
            if attempt == retries:
                raise
            logger.warning(
                f"DB non disponible (tentative {attempt}/{retries}) : {e}. "
                f"Nouvel essai dans {delay}s..."
            )
            await asyncio.sleep(delay)


async def init_db():
    global _pool, engine
    try:
        url = settings.DATABASE_URL
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        url = url.replace("postgres://", "postgresql://")

        _pool = await _connect_with_retry(url)
        engine = _pool

        async with _pool.acquire() as conn:

            await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
            logger.info("Extension uuid-ossp OK")

            core_file = MIGRATIONS_DIR / "schema_core.sql"
            if core_file.exists():
                await _run_sql_file(conn, core_file)
            else:
                raise FileNotFoundError(f"schema_core.sql absent : {core_file}")

            seed_core = MIGRATIONS_DIR / "seed_core.sql"
            if seed_core.exists():
                await _run_sql_file(conn, seed_core)

            postgis_ok = False
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
                postgis_ok = True
                logger.info("Extension PostGIS activee")
            except Exception as e:
                logger.warning(
                    f"PostGIS non disponible : {e}. "
                    "Tables spatiales ignorees. Auth operationnelle."
                )

            if postgis_ok:
                spatial_file = MIGRATIONS_DIR / "schema_spatial.sql"
                if spatial_file.exists():
                    try:
                        await _run_sql_file(conn, spatial_file)
                    except Exception as e:
                        logger.warning(f"schema_spatial.sql partiel : {e}")

                seed_full = MIGRATIONS_DIR / "seed.sql"
                if seed_full.exists():
                    try:
                        await _run_sql_file(conn, seed_full)
                    except Exception as e:
                        logger.warning(f"seed.sql partiel : {e}")

        logger.info("Pool DB pret")

    except Exception as e:
        logger.error(f"Erreur init DB: {e}")
        raise


async def get_db():
    if _pool is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Base de donnees non disponible. Verifiez DATABASE_URL."
        )
    async with _pool.acquire() as conn:
        yield conn


async def close_db():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Pool DB non initialise")
    return _pool
