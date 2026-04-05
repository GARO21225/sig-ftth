FROM python:3.11-slim

WORKDIR /app

# Dépendances système minimales (GDAL allégé)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libgeos-dev \
    libproj-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python en deux passes :
# 1. Packages lourds (géospatial) d'abord
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Installer sans gdal-python (trop lourd pour Railway free tier)
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    "uvicorn[standard]==0.27.0" \
    pydantic==2.5.3 \
    "pydantic-settings==2.1.0" \
    sqlalchemy[asyncio]==2.0.25 \
    asyncpg==0.29.0 \
    alembic==1.13.1 \
    "python-jose[cryptography]==3.3.0" \
    "passlib[bcrypt]==1.7.4" \
    python-multipart==0.0.6 \
    openpyxl==3.1.2 \
    httpx==0.26.0 \
    websockets==12.0 \
    shapely==2.0.2 \
    "redis[asyncio]==5.0.1" \
    jinja2==3.1.3 \
    aiosmtplib==3.0.1 \
    geopandas==0.14.3

# Installer le reste
RUN pip install --no-cache-dir -r requirements.txt || true

# Code source
COPY . .

# Créer dossiers nécessaires
RUN mkdir -p /app/uploads /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Démarrage — $PORT injecté par Railway
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --loop uvloop
