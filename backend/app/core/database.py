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

            # uuid-ossp est necessaire pour les UUID (disponible partout)
            await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
            logger.info("Extension uuid-ossp OK")

            # Schema core : auth tables sans PostGIS (toujours execute)
            core_file = MIGRATIONS_DIR / "schema_core.sql"
            if core_file.exists():
                await _run_sql_file(conn, core_file)
            else:
                raise FileNotFoundError(f"schema_core.sql absent : {core_file}")

            # Seed core : utilisateurs seulement (sans dependance PostGIS)
            seed_core = MIGRATIONS_DIR / "seed_core.sql"
            if seed_core.exists():
                await _run_sql_file(conn, seed_core)

            # PostGIS + tables spatiales : tentative, echec non bloquant
            postgis_ok = False
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
                postgis_ok = True
                logger.info("Extension PostGIS activee")
            except Exception as e:
                logger.warning(
                    f"PostGIS non disponible sur ce serveur PostgreSQL : {e}. "
                    "Les tables spatiales ne seront pas creees. "
                    "Pour activer PostGIS sur Railway, utilisez un service "
                    "PostgreSQL avec l'image postgis/postgis:15-3.3"
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

        logger.info("Pool DB pret — auth operationnelle")

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
