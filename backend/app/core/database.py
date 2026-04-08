import asyncpg
import logging
import os
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool = None
engine = None

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


async def _table_exists(conn, table_name: str) -> bool:
    """Verifie l'existence reelle via requete directe.
    information_schema peut mentir sur une table fantome/corrompue."""
    try:
        await conn.fetchrow(f"SELECT 1 FROM {table_name} LIMIT 1")
        return True
    except asyncpg.exceptions.UndefinedTableError:
        return False
    except Exception:
        return False


async def _run_sql_file(conn, filepath: Path):
    """Execute un fichier SQL."""
    sql = filepath.read_text(encoding="utf-8")
    try:
        await conn.execute(sql)
        logger.info(f"SQL execute : {filepath.name}")
    except Exception as e:
        logger.error(f"Erreur {filepath.name} : {e}")
        raise


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
            table_ok = await _table_exists(conn, "utilisateur")

            if not table_ok:
                logger.warning("Tables absentes — initialisation automatique")

                try:
                    await conn.execute('CREATE EXTENSION IF NOT EXISTS postgis;')
                    await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
                    logger.info("Extensions PostGIS + uuid-ossp activees")
                except Exception as e:
                    logger.error(f"Impossible d'activer les extensions : {e}")
                    raise

                schema_file = MIGRATIONS_DIR / "schema.sql"
                seed_file   = MIGRATIONS_DIR / "seed.sql"

                if schema_file.exists():
                    await _run_sql_file(conn, schema_file)
                else:
                    logger.error(f"schema.sql introuvable : {schema_file}")
                    raise FileNotFoundError(f"schema.sql absent : {schema_file}")

                if seed_file.exists():
                    await _run_sql_file(conn, seed_file)
                else:
                    logger.warning("seed.sql introuvable")

                logger.info("Base de donnees initialisee avec schema + seed")
            else:
                logger.info("Tables existantes — pas de migration necessaire")

        logger.info("Pool DB pret")

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
        logger.info("Pool DB ferme")


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Pool DB non initialise")
    return _pool
