"""
config.py — Configuration Railway-compatible
Problèmes résolus :
  1. ALLOWED_ORIGINS : déclaré comme str pour éviter que Pydantic v2 tente
     de coercer la valeur brute de l'env var avant le validator.
     La propriété `allowed_origins_list` expose la liste parsée pour CORS.
  2. DATABASE_URL : Railway envoie postgres:// → on convertit pour asyncpg
  3. REDIS_URL vide → Redis optionnel, pas de crash
  4. SECRET_KEY trop courte → validation minimale
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import json


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
    # Déclaré comme str pour éviter que Pydantic v2 tente de coercer
    # la valeur brute de l'env var avant que le validator ne s'exécute.
    # Formats acceptés dans la variable Railway ALLOWED_ORIGINS :
    #   JSON array : ["https://garo21225.github.io","http://localhost:3000"]
    #   CSV string : https://garo21225.github.io,http://localhost:3000
    #   Vide       → origines par défaut s'appliquent
    ALLOWED_ORIGINS: str = (
        "https://garo21225.github.io,"
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:3000"
    )

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
    def normalise_allowed_origins(cls, v) -> str:
        """
        Normalise ALLOWED_ORIGINS en une chaîne CSV.
        Accepte 3 formats depuis Railway :
          1. JSON array  : ["https://x.com","http://localhost:3000"]
          2. CSV string  : https://x.com,http://localhost:3000
          3. Liste Python (passage interne)
        Retourne toujours une str CSV pour correspondre au type du champ.
        """
        default = (
            "https://garo21225.github.io,"
            "http://localhost:3000,"
            "http://localhost:5173,"
            "http://127.0.0.1:3000"
        )
        if isinstance(v, list):
            return ",".join(str(o).strip() for o in v if str(o).strip())
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return default
            # Tenter JSON d'abord
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return ",".join(str(o).strip() for o in parsed if str(o).strip())
            except (json.JSONDecodeError, ValueError):
                pass
            # Sinon déjà CSV — retourner tel quel
            return v
        return default

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

    # ─────────────────────────────────────────────────────────
    # PROPRIÉTÉS CALCULÉES
    # ─────────────────────────────────────────────────────────

    @property
    def allowed_origins_list(self) -> List[str]:
        """Retourne ALLOWED_ORIGINS parsé en liste, prêt pour CORSMiddleware."""
        railway_url = "https://sig-ftth-production.up.railway.app"
        origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        if railway_url not in origins:
            origins.append(railway_url)
        return origins

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
