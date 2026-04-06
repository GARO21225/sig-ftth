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
    expose_headers=["Content-Disposition"],
)

# Imports directs
from app.api import auth
app.include_router(auth.router, prefix="/auth", tags=["🔐 Auth"])

from app.api import dashboard
app.include_router(dashboard.router, prefix="/api/v1", tags=["📊 Dashboard"])

from app.api import export
app.include_router(export.router, prefix="/api/v1", tags=["📤 Export"])

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
        logger.warning(f"DB health: {e}")
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "database": "connected" if db_ok else "error",
    }

from app.api import logements
app.include_router(logements.router, prefix="/api/v1", tags=["🏠 Logements"])

from app.api import travaux
app.include_router(travaux.router, prefix="/api/v1", tags=["🏗️ Travaux"])

from app.api import websocket
app.include_router(websocket.router, tags=["🔌 WebSocket"])

# Modules stubs — import protégé
import importlib
for mod_name, prefix, tags in [
    ("app.api.equipements",  "/api/v1", ["📦 Équipements"]),
    ("app.api.catalogue",    "/api/v1", ["📋 Catalogue"]),
    ("app.api.import_dwg",   "/api/v1", ["📥 Import DWG"]),
    ("app.api.itineraires",  "/api/v1", ["🧭 Itinéraires"]),
]:
    try:
        mod = importlib.import_module(mod_name)
        app.include_router(mod.router, prefix=prefix, tags=tags)
    except Exception as e:
        logger.warning(f"⚠️ {mod_name} ignoré: {e}")

@app.get("/health", tags=["⚙️ Système"])
async def health():
    from sqlalchemy import text
    from app.core.database import engine
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.warning(f"DB health: {e}")
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "database": "connected" if db_ok else "error",
    }

@app.get("/", tags=["⚙️ Système"])
async def root():
    return {"message": "SIG FTTH API v6.1", "docs": "/docs", "health": "/health"}
