from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "SIG FTTH"
    VERSION: str = "6.1.0"
    ENVIRONMENT: str = "production"

    # JWT
    SECRET_KEY: str = "change-me-MUST-set-in-railway-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database — Railway fournit DATABASE_URL avec prefix postgresql://
    # On le convertit automatiquement pour asyncpg
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/sigftth"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        # Railway donne postgresql:// → on veut postgresql+asyncpg://
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Redis — optionnel sur Railway
    REDIS_URL: str = ""
    CACHE_TTL: int = 300

    # CORS — GitHub Pages + local
    ALLOWED_ORIGINS: List[str] = [
        "https://garo21225.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@sig-ftth.ci"

    # Upload
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB
    UPLOAD_DIR: str = "/app/uploads"

    # Carte (Abidjan par défaut)
    MAP_DEFAULT_LAT: float = 5.3599
    MAP_DEFAULT_LNG: float = -4.0083
    MAP_DEFAULT_ZOOM: int = 13

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
