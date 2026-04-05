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
    logger.info("🚀 SIG FTTH v6.1 démarrage...")
    await init_db()
    await init_redis()
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

# CORS — autoriser GitHub Pages + local
origins = settings.ALLOWED_ORIGINS + [
    "https://sig-ftth-production.up.railway.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Pour les exports fichiers
)

from app.api import (
    auth, noeuds_telecom, noeuds_gc,
    liens_telecom, liens_gc, logements,
    equipements, catalogue, import_dwg,
    itineraires, travaux, dashboard,
    export, eligibilite, websocket
)

app.include_router(auth.router,           prefix="/auth",    tags=["🔐 Auth"])
app.include_router(noeuds_telecom.router, prefix="/api/v1",  tags=["📡 Noeuds Télécom"])
app.include_router(noeuds_gc.router,      prefix="/api/v1",  tags=["🏗️ Noeuds GC"])
app.include_router(liens_telecom.router,  prefix="/api/v1",  tags=["〰️ Liens Télécom"])
app.include_router(liens_gc.router,       prefix="/api/v1",  tags=["⚡ Liens GC"])
app.include_router(logements.router,      prefix="/api/v1",  tags=["🏠 Logements"])
app.include_router(equipements.router,    prefix="/api/v1",  tags=["📦 Équipements"])
app.include_router(catalogue.router,      prefix="/api/v1",  tags=["📋 Catalogue"])
app.include_router(import_dwg.router,     prefix="/api/v1",  tags=["📥 Import DWG"])
app.include_router(itineraires.router,    prefix="/api/v1",  tags=["🧭 Itinéraires"])
app.include_router(travaux.router,        prefix="/api/v1",  tags=["🏗️ Travaux"])
app.include_router(dashboard.router,      prefix="/api/v1",  tags=["📊 Dashboard"])
app.include_router(export.router,         prefix="/api/v1",  tags=["📤 Export"])
app.include_router(eligibilite.router,    prefix="/api/v1",  tags=["💼 Éligibilité"])
app.include_router(websocket.router,                         tags=["🔌 WebSocket"])

@app.get("/health", tags=["⚙️ Système"])
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "railway": True
    }

@app.get("/", tags=["⚙️ Système"])
async def root():
    return {
        "message": "SIG FTTH API v6.1",
        "docs": "/docs",
        "health": "/health"
    }
