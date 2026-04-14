FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev libgeos-dev libproj-dev \
    libjpeg-dev zlib1g-dev libpng-dev libffi-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt --root-user-action=ignore

COPY . .

# Vérifications
RUN test -f app/core/migrations/schema.sql    || (echo "ABSENT: schema.sql"    && exit 1)
RUN test -f app/core/migrations/seed.sql      || (echo "ABSENT: seed.sql"      && exit 1)
RUN test -f app/core/migrations/schema_core.sql || (echo "ABSENT: schema_core.sql" && exit 1)

RUN mkdir -p /app/uploads /app/logs

# Health check intégré Docker (secondaire — Railway utilise son propre check)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
