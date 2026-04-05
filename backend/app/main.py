"""
main.py — FastAPI SIG FTTH v6.1
Corrections Railway :
  - Import modules vides protégés par try/except
  - CORS étendu
  - Healthcheck robuste
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.core.redis import init_redis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(levelname)s — %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 SIG FTTH v6.1 démarrage sur Railway...")
    try:
        await init_db()
    except Exception as e:
        logger.error(f"❌ Erreur DB: {e} — L'app démarre quand même")
    try:
        await init_redis()
    except Exception as e:
        logger.warning(f"⚠️ Redis ignoré: {e}")
    logger.info("✅ Application prête !")
    yield
    logger.info("🛑 Arrêt...")

app = FastAPI(
    title="SIG FTTH API",
    description="API SIG Web FTTH v6.1 — Réseau Fibre Optique & Génie Civil",
    version="6.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS robuste
cors_origins = list(settings.ALLOWED_ORIGINS) if isinstance(
    settings.ALLOWED_ORIGINS, list
) else [settings.ALLOWED_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ── Imports protégés (modules potentiellement vides) ─────────
def _safe_include(router_path: str, prefix: str, tags: list):
    """Import un router sans crasher si le module est vide."""
    try:
        parts = router_path.rsplit(".", 1)
        module = __import__(parts[0], fromlist=[parts[1]])
        router = getattr(module, parts[1])
        app.include_router(router, prefix=prefix, tags=tags)
        logger.info(f"✅ Router chargé : {router_path}")
    except (ImportError, AttributeError) as e:
        logger.warning(f"⚠️ Router ignoré ({router_path}): {e}")

# Modules complets (chargement direct)
from app.api import auth
app.include_router(auth.router, prefix="/auth", tags=["🔐 Auth"])

from app.api import dashboard
app.include_router(dashboard.router, prefix="/api/v1", tags=["📊 Dashboard"])

from app.api import export
app.include_router(export.router, prefix="/api/v1", tags=["📤 Export"])

from app.api import eligibilite
app.include_router(eligibilite.router, prefix="/api/v1", tags=["💼 Éligibilité"])

from app.api import noeuds_telecom
app.include_router(noeuds_telecom.router, prefix="/api/v1", tags=["📡 Noeuds Télécom"])

from app.api import noeuds_gc
app.include_router(noeuds_gc.router, prefix="/api/v1", tags=["🏗️ Noeuds GC"])

from app.api import liens_telecom
app.include_router(liens_telecom.router, prefix="/api/v1", tags=["〰️ Liens Télécom"])

from app.api import liens_gc
app.include_router(liens_gc.router, prefix="/api/v1", tags=["⚡ Liens GC"])

from app.api import logements
app.include_router(logements.router, prefix="/api/v1", tags=["🏠 Logements"])

from app.api import travaux
app.include_router(travaux.router, prefix="/api/v1", tags=["🏗️ Travaux"])

from app.api import websocket
app.include_router(websocket.router, tags=["🔌 WebSocket"])

# Modules vides → chargement protégé
_safe_include("app.api.equipements.router",  "/api/v1", ["📦 Équipements"])
_safe_include("app.api.catalogue.router",    "/api/v1", ["📋 Catalogue"])
_safe_include("app.api.import_dwg.router",   "/api/v1", ["📥 Import DWG"])
_safe_include("app.api.itineraires.router",  "/api/v1", ["🧭 Itinéraires"])

# ── Routes système ───────────────────────────────────────────
@app.get("/health", tags=["⚙️ Système"])
async def health():
    from app.core.database import engine
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.warning(f"DB health check failed: {e}")

    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "error",
        "railway": True,
    }

@app.get("/", tags=["⚙️ Système"])
async def root():
    return {
        "message": "SIG FTTH API v6.1",
        "docs": "/docs",
        "health": "/health",
        "frontend": "https://garo21225.github.io/sig-ftth/",
    }
