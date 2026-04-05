FROM python:3.11-slim

WORKDIR /app

# Dépendances système (PostGIS/GDAL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Code source
COPY . .

# Créer dossier uploads
RUN mkdir -p /app/uploads

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Démarrage — Railway injecte $PORT automatiquement
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
