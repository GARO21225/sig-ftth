import asyncpg
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
        engine = _pool

        async with _pool.acquire() as conn:
            # Extensions (idempotent)
            await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
            await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
            logger.info("Extensions OK")

            # Schema (idempotent — tous CREATE TABLE IF NOT EXISTS)
            schema_file = MIGRATIONS_DIR / "schema.sql"
            if schema_file.exists():
                await _run_sql_file(conn, schema_file)
            else:
                raise FileNotFoundError(f"schema.sql absent : {schema_file}")

            # Seed (idempotent — tous ON CONFLICT DO NOTHING)
            seed_file = MIGRATIONS_DIR / "seed.sql"
            if seed_file.exists():
                await _run_sql_file(conn, seed_file)

        logger.info("Pool DB pret et base initialisee")

    except Exception as e:
        logger.error(f"Erreur init DB: {e}")
        raise


async def get_db():
    if _pool is None:
        raise RuntimeError("Pool DB non initialise")
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
