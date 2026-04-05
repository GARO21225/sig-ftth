"""
config.py — Configuration Railway-compatible
Problèmes résolus :
  1. ALLOWED_ORIGINS : List[str] → pydantic attend du JSON, Railway envoie une string
     → On utilise un validator qui accepte les deux formats
  2. DATABASE_URL : Railway envoie postgres:// → on convertit pour asyncpg
  3. REDIS_URL vide → Redis optionnel, pas de crash
  4. SECRET_KEY trop courte → validation minimale
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator
from typing import List, Union
import json
import os


class Settings(BaseSettings):
    APP_NAME: str = "SIG FTTH"
    VERSION: str = "6.1.0"
    ENVIRONMENT: str = "production"

    # ── JWT ──────────────────────────────────────────────────
    SECRET_KEY: str = "sig-ftth-default-secret-key-change-me-in-railway-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ─────────────────────────────────────────────
    # Railway injecte DATABASE_URL avec préfixe postgres:// ou postgresql://
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/sigftth"

    DB_POOL_SIZE: int = 5       # Réduit pour Railway free tier
    DB_MAX_OVERFLOW: int = 10

    # ── Redis (optionnel) ────────────────────────────────────
    REDIS_URL: str = ""
    CACHE_TTL: int = 300

    # ── CORS ─────────────────────────────────────────────────
    # IMPORTANT Railway : mettre la valeur EN JSON dans la variable
    # Exemple : ["https://garo21225.github.io","http://localhost:3000"]
    # OU laisser vide → les origines par défaut s'appliquent
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "https://garo21225.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    # ── Email ────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@sig-ftth.ci"

    # ── Upload ───────────────────────────────────────────────
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB
    UPLOAD_DIR: str = "/app/uploads"

    # ── Carte ────────────────────────────────────────────────
    MAP_DEFAULT_LAT: float = 5.3599
    MAP_DEFAULT_LNG: float = -4.0083
    MAP_DEFAULT_ZOOM: int = 13

    # ─────────────────────────────────────────────────────────
    # VALIDATORS
    # ─────────────────────────────────────────────────────────

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """
        Accepte 3 formats possibles depuis Railway :
          1. JSON array  : ["https://x.com","http://localhost:3000"]
          2. CSV string  : https://x.com,http://localhost:3000
          3. Liste Python déjà parsée
        """
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if not v:
                # Vide → origines par défaut
                return [
                    "https://garo21225.github.io",
                    "http://localhost:3000",
                    "http://localhost:5173",
                ]
            # Tenter JSON d'abord
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            # Sinon CSV
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v):
        """
        Railway donne postgres:// ou postgresql://
        SQLAlchemy asyncpg veut postgresql+asyncpg://
        """
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v):
        if isinstance(v, str) and len(v) < 32:
            import secrets
            new_key = secrets.token_hex(32)
            print(
                f"⚠️  SECRET_KEY trop courte ({len(v)} chars) "
                f"— clé auto-générée (non persistante !)\n"
                f"   → Définir SECRET_KEY dans Railway Variables !"
            )
            return new_key
        return v

    @model_validator(mode="after")
    def validate_all(self):
        """Ajouter Railway URL elle-même dans les origines autorisées."""
        railway_url = "https://sig-ftth-production.up.railway.app"
        origins = self.ALLOWED_ORIGINS
        if isinstance(origins, list) and railway_url not in origins:
            origins.append(railway_url)
        return self

    # Propriété pour accéder à l'URL asyncpg (déjà corrigée par validator)
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return self.DATABASE_URL

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",  # Ignorer les vars Railway inconnues
    }


settings = Settings()
