FROM python:3.11-slim

WORKDIR /app

# System deps — inclut tout ce qu'il faut pour Pillow, pyproj, shapely, asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    libpq-dev \
    libgeos-dev \
    libproj-dev \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
    --root-user-action=ignore

COPY . .

# Vérifications migrations
RUN test -f app/core/migrations/schema.sql   || (echo "❌ schema.sql ABSENT" && exit 1)
RUN test -f app/core/migrations/seed.sql     || (echo "❌ seed.sql ABSENT"   && exit 1)
RUN test -f app/core/migrations/schema_core.sql || (echo "❌ schema_core.sql ABSENT" && exit 1)

RUN mkdir -p /app/uploads /app/logs

# Script de démarrage — $PORT évalué au runtime
RUN printf '#!/bin/sh\nexec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1\n' \
    > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
