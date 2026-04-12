import logging
from typing import Any, Optional
from app.core.config import settings
import json

logger = logging.getLogger(__name__)
redis_client = None

async def init_redis():
    global redis_client
    if not settings.REDIS_URL:
        logger.warning("⚠️ REDIS_URL non défini — cache désactivé")
        return
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await redis_client.ping()
        logger.info("✅ Redis connecté")
    except Exception as e:
        logger.warning(f"⚠️ Redis non disponible: {e} — cache désactivé")
        redis_client = None

async def cache_get(key: str) -> Optional[Any]:
    if not redis_client:
        return None
    try:
        data = await redis_client.get(key)
        return json.loads(data) if data else None
    except Exception:
        return None

async def cache_set(key: str, value: Any, ttl: int = settings.CACHE_TTL):
    if not redis_client:
        return
    try:
        await redis_client.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass

async def cache_delete(pattern: str):
    if not redis_client:
        return
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
    except Exception:
        pass
