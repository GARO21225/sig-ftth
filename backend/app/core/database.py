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
    row = await conn.fetchrow(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name=$1)",
        table_name
    )
    return row["exists"]


async def _run_sql_file(conn, filepath: Path):
    """Exécute un fichier SQL en ignorant les erreurs de duplication."""
    sql = filepath.read_text(encoding="utf-8")
    try:
        await conn.execute(sql)
        logger.info(f"✅ SQL exécuté : {filepath.name}")
    except Exception as e:
        logger.warning(f"⚠️  {filepath.name} partiel : {e}")


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
            # ── Vérifier si le schéma est initialisé ──────────────────────
            table_ok = await _table_exists(conn, "utilisateur")

            if not table_ok:
                logger.warning("⚠️  Tables absentes — initialisation automatique…")

                schema_file = MIGRATIONS_DIR / "schema.sql"
                seed_file   = MIGRATIONS_DIR / "seed.sql"

                if schema_file.exists():
                    await _run_sql_file(conn, schema_file)
                else:
                    logger.error("❌ schema.sql introuvable")

                if seed_file.exists():
                    await _run_sql_file(conn, seed_file)
                else:
                    logger.warning("⚠️  seed.sql introuvable")

                logger.info("✅ Base de données initialisée avec schéma + seed")
            else:
                logger.info("✅ Tables existantes — pas de migration nécessaire")

        logger.info("✅ Pool DB prêt")

    except Exception as e:
        logger.error(f"❌ Erreur init DB: {e}")
        raise


async def get_db():
    if _pool is None:
        raise RuntimeError("Pool DB non initialisé")
    async with _pool.acquire() as conn:
        yield conn


async def close_db():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("✅ Pool DB fermé")


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Pool DB non initialisé")
    return _pool
