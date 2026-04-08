FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev libgeos-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY . .
# ── Vérification critique : migrations doivent être présentes ──────────────
RUN test -f app/core/migrations/schema.sql || (echo "❌ schema.sql ABSENT de l'image !" && exit 1)
RUN test -f app/core/migrations/seed.sql   || (echo "❌ seed.sql ABSENT de l'image !"   && exit 1)
RUN mkdir -p /app/uploads /app/logs

# Script shell dédié → $PORT évalué au runtime
RUN printf '#!/bin/sh\nexec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1\n' \
    > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
