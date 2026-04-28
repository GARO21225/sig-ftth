from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    APP_NAME: str = "SIG FTTH"
    VERSION: str = "6.1.0"
    ENVIRONMENT: str = "production"

    SECRET_KEY: str = "86960f69b5f54a7f77c72a4a8255da8365e248a9ae711b48130d84a63a97acb5"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Railway injecte DATABASE_URL — converti automatiquement
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/sigftth"

    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    REDIS_URL: str = ""
    CACHE_TTL: int = 300

    # ⚠️ STR pur — pydantic-settings ne parse jamais une List automatiquement
    # Dans Railway Variables : laisser VIDE ou ne pas définir
    ALLOWED_ORIGINS: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@sig-ftth.ci"

    MAX_UPLOAD_SIZE: int = 52428800
    UPLOAD_DIR: str = "/app/uploads"

    MAP_DEFAULT_LAT: float = 5.3599
    MAP_DEFAULT_LNG: float = -4.0083
    MAP_DEFAULT_ZOOM: int = 13

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        defaults = [
            "https://garo21225.github.io",
            "https://sig-ftth.netlify.app",
            "https://sig-ftth-production-a3aa.up.railway.app",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
        ]
        v = (self.ALLOWED_ORIGINS or "").strip()
        if not v:
            return defaults
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return list(set(defaults + parsed))
        except (json.JSONDecodeError, ValueError):
            pass
        extras = [o.strip() for o in v.split(",") if o.strip()]
        return list(set(defaults + extras))

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
    }


settings = Settings()
