from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.core.redis import init_redis

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s — %(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 SIG FTTH v6.1 démarrage Railway...")
    logger.info(f"🌐 CORS: {settings.CORS_ORIGINS_LIST}")
    try:
        await init_db()
    except Exception as e:
        logger.error(f"❌ DB init: {e} — L'app continue")
    try:
        await init_redis()
    except Exception as e:
        logger.warning(f"⚠️ Redis ignoré: {e}")
    logger.info("✅ Prêt !")
    yield
    logger.info("🛑 Arrêt...")

app = FastAPI(
    title="SIG FTTH API",
    description="API SIG Web FTTH v6.1",
    version="6.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # BUG #5 FIX — expose_headers complet
    expose_headers=[
        "Content-Disposition",
        "Content-Range",
        "X-Total-Count",
        "X-Request-Id",
    ],
)

# ─── Routes Auth ────────────────────────────
from app.api import auth
app.include_router(auth.router, prefix="/auth", tags=["🔐 Auth"])

# ─── Routes Dashboard ───────────────────────
from app.api import dashboard
app.include_router(dashboard.router, prefix="/api/v1", tags=["📊 Dashboard"])

# ─── Routes Export ──────────────────────────
from app.api import export
app.include_router(export.router, prefix="/api/v1", tags=["📤 Export"])

# ─── Routes Réseau Télécom ──────────────────
from app.api import noeuds_telecom
app.include_router(noeuds_telecom.router, prefix="/api/v1", tags=["📡 Nœuds Télécom"])

from app.api import liens_telecom
app.include_router(liens_telecom.router, prefix="/api/v1", tags=["〰️ Liens Télécom"])

# ─── Routes Génie Civil ─────────────────────
# BUG #6 FIX — importer noeuds_gc corrigé (préfixe /noeuds-gc)
from app.api import noeuds_gc
app.include_router(noeuds_gc.router, prefix="/api/v1", tags=["🏗️ Nœuds GC"])

from app.api import liens_gc
app.include_router(liens_gc.router, prefix="/api/v1", tags=["⚡ Liens GC"])

# ─── Routes Logements ───────────────────────
from app.api import logements
app.include_router(logements.router, prefix="/api/v1", tags=["🏠 Logements"])

# ─── Routes Travaux ─────────────────────────
from app.api import travaux
app.include_router(travaux.router, prefix="/api/v1", tags=["🏗️ Travaux"])

# ─── Routes Éligibilité ─────────────────────
from app.api import eligibilite
app.include_router(eligibilite.router, prefix="/api/v1", tags=["📡 Éligibilité"])

# ─── WebSocket ──────────────────────────────
from app.api import websocket
app.include_router(websocket.router, tags=["🔌 WebSocket"])

# ─── Modules stubs (import protégé) ─────────
import importlib
# ─── Zones d'influence ─────────────────────
from app.api import zones_influence
app.include_router(zones_influence.router, prefix="/api/v1", tags=["🗺️ Zones d'influence"])

# ─── Itinéraires ────────────────────────────
from app.api import itineraires
app.include_router(itineraires.router, prefix="/api/v1", tags=["🧭 Itinéraires"])

# ─── Import DWG ─────────────────────────────
from app.api import import_dwg
app.include_router(import_dwg.router, prefix="/api/v1", tags=["📥 Import DWG"])

# ─── Modules stubs (import protégé) ─────────
for mod_name, prefix, tags in [
    ("app.api.equipements",  "/api/v1", ["📦 Équipements"]),
    ("app.api.catalogue",    "/api/v1", ["📋 Catalogue"]),
]:
    try:
        mod = importlib.import_module(mod_name)
        app.include_router(mod.router, prefix=prefix, tags=tags)
    except Exception as e:
        logger.warning(f"⚠️ {mod_name} ignoré: {e}")

# ─── BUG #3 FIX — UNE SEULE route /health ──
@app.get("/health", tags=["⚙️ Système"])
async def health():
    from app.core.database import _pool
    db_ok = False
    try:
        if _pool:
            async with _pool.acquire() as conn:
                await conn.execute("SELECT 1")
            db_ok = True
    except Exception as e:
        logger.warning(f"DB health check: {e}")
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "database": "connected" if db_ok else "error",
    }

@app.get("/", tags=["⚙️ Système"])
async def root():
    return {
        "message": "SIG FTTH API v6.1",
        "docs": "/docs",
        "health": "/health"
    }
