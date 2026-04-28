"""SIG FTTH API v6.1 — Orange CI"""
import logging
import importlib
import traceback
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ─── Startup ──────────────────────────────────────────────────────────────────
_db_ready = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """App démarre immédiatement. DB s'initialise en arrière-plan."""
    logger.info("🚀 SIG FTTH v6.1 — démarrage")

    async def _init():
        global _db_ready
        try:
            from app.core.database import init_db
            await init_db()
            _db_ready = True
            logger.info("✅ DB prête")
        except Exception as e:
            logger.error(f"❌ DB: {e}")
        try:
            from app.core.redis import init_redis
            await init_redis()
        except Exception as e:
            logger.warning(f"⚠️ Redis: {e}")

    # Lance l'init sans bloquer — app écoute IMMÉDIATEMENT
    loop = asyncio.get_event_loop()
    loop.create_task(_init())

    yield  # App prête et en écoute

    logger.info("🛑 Arrêt")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="SIG FTTH API", version="6.1.0", lifespan=lifespan,
              docs_url="/docs", redoc_url="/redoc")

app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — toujours en premier
try:
    from app.core.config import settings
    origins = settings.CORS_ORIGINS_LIST
except Exception:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Range", "X-Total-Count"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
_loaded_modules = []
_failed_modules = []

_ROUTES = [
    ("app.api.auth",            "router",       "/auth"),
    ("app.api.dashboard",       "router",       "/api/v1"),
    ("app.api.export",          "router",       "/api/v1"),
    ("app.api.noeuds_telecom",  "router",       "/api/v1"),
    ("app.api.liens_telecom",   "router",       "/api/v1"),
    ("app.api.noeuds_gc",       "router",       "/api/v1"),
    ("app.api.liens_gc",        "router",       "/api/v1"),
    ("app.api.logements",       "router",       "/api/v1"),
    ("app.api.travaux",         "router",       "/api/v1"),
    ("app.api.eligibilite",     "router",       "/api/v1"),
    ("app.api.websocket",       "router",       ""),
    ("app.api.zones_influence", "router",       "/api/v1"),
    ("app.api.itineraires",     "router",       "/api/v1"),
    ("app.api.import_dwg",      "router",       "/api/v1"),
    ("app.api.analytics",       "router",       "/api/v1"),
    ("app.api.catalogue",       "router",       "/api/v1"),
]

for _mod_path, _attr, _prefix in _ROUTES:
    try:
        _mod = importlib.import_module(_mod_path)
        _router = getattr(_mod, _attr, None)
        if _router:
            if _prefix:
                app.include_router(_router, prefix=_prefix)
            else:
                app.include_router(_router)
            _loaded_modules.append(_mod_path.split(".")[-1])
    except Exception as _e:
        _failed_modules.append(_mod_path.split(".")[-1])
        logger.error(f"❌ {_mod_path}: {_e}\n{traceback.format_exc()}")

# Modules spéciaux
for _mod_path, _attrs, _prefix in [
    ("app.api.equipements",  ["equip_router"], "/api/v1"),
    ("app.api.api_publique", ["router", "admin_router"], "/api/v1"),
]:
    try:
        _mod = importlib.import_module(_mod_path)
        for _attr in _attrs:
            _r = getattr(_mod, _attr, None)
            if _r:
                app.include_router(_r, prefix=_prefix)
        _loaded_modules.append(_mod_path.split(".")[-1])
    except Exception as _e:
        _failed_modules.append(_mod_path.split(".")[-1])
        logger.error(f"❌ {_mod_path}: {_e}")

logger.info(f"📦 {len(_loaded_modules)} modules OK | {len(_failed_modules)} en erreur: {_failed_modules}")

# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    db_status = "initializing"
    if _db_ready:
        try:
            from app.core.database import _pool
            if _pool:
                async with _pool.acquire() as conn:
                    await conn.execute("SELECT 1")
                db_status = "connected"
            else:
                db_status = "no_pool"
        except Exception as e:
            db_status = f"error: {str(e)[:50]}"
    return {
        "status": "ok",
        "db": db_status,
        "modules": len(_loaded_modules),
        "failed": _failed_modules,
        "version": "6.1.0",
    }

@app.get("/")
async def root():
    return {"message": "SIG FTTH API v6.1", "docs": "/docs", "health": "/health"}
