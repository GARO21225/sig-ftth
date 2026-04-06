"""
init_users.py — Initialisation automatique des utilisateurs SIG FTTH
=====================================================================
Ce script est appelé au démarrage de l'application (lifespan FastAPI).
Il crée ou met à jour les comptes utilisateurs de base sans intervention
manuelle, ce qui est indispensable sur Railway Free Plan (pas de Shell).

Utilisateurs créés :
  • admin@sig-ftth.ci        / Admin@1234   — KOUAME Edgar       (admin)
  • chef@sig-ftth.ci         / Chef@1234    — TRAORE Moussa      (chef_projet)
  • technicien@sig-ftth.ci   / Tech@1234    — BAMBA Seydou       (technicien)
  • analyste@sig-ftth.ci     / Analyse@1234 — COULIBALY Fatou    (analyste)
  • commercial@sig-ftth.ci   / Commerce@1234— DIALLO Aminata     (commercial)

Comportement :
  - Si l'utilisateur n'existe pas → INSERT
  - Si l'utilisateur existe déjà  → UPDATE du hash + réactivation du compte
  - Toutes les erreurs sont loguées sans faire crasher l'application
"""

import logging
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Définition des utilisateurs à initialiser
# ---------------------------------------------------------------------------

USERS_TO_INIT = [
    {
        "email": "admin@sig-ftth.ci",
        "password": "Admin@1234",
        "nom": "KOUAME",
        "prenom": "Edgar",
        "role": "admin",
    },
    {
        "email": "chef@sig-ftth.ci",
        "password": "Chef@1234",
        "nom": "TRAORE",
        "prenom": "Moussa",
        "role": "chef_projet",
    },
    {
        "email": "technicien@sig-ftth.ci",
        "password": "Tech@1234",
        "nom": "BAMBA",
        "prenom": "Seydou",
        "role": "technicien",
    },
    {
        "email": "analyste@sig-ftth.ci",
        "password": "Analyse@1234",
        "nom": "COULIBALY",
        "prenom": "Fatou",
        "role": "analyste",
    },
    {
        "email": "commercial@sig-ftth.ci",
        "password": "Commerce@1234",
        "nom": "DIALLO",
        "prenom": "Aminata",
        "role": "commercial",
    },
]


# ---------------------------------------------------------------------------
# Fonction principale — appelée depuis main.py au démarrage
# ---------------------------------------------------------------------------

async def init_users(pool) -> None:
    """
    Crée ou met à jour les utilisateurs définis dans USERS_TO_INIT.

    :param pool: asyncpg.Pool déjà initialisé par init_db()
    """
    logger.info("👤 Initialisation des utilisateurs de base...")

    created = 0
    updated = 0
    errors = 0

    async with pool.acquire() as conn:
        for user in USERS_TO_INIT:
            try:
                hashed = pwd_context.hash(user["password"])

                existing = await conn.fetchrow(
                    "SELECT id, email FROM utilisateur WHERE email = $1",
                    user["email"],
                )

                if existing:
                    # Mise à jour du hash + réactivation si le compte était désactivé
                    await conn.execute(
                        """
                        UPDATE utilisateur
                        SET mot_de_passe_hash  = $1,
                            actif              = TRUE,
                            compte_verrouille  = FALSE,
                            nb_tentatives_echec = 0,
                            date_modification  = NOW()
                        WHERE email = $2
                        """,
                        hashed,
                        user["email"],
                    )
                    logger.info(
                        "🔄 Utilisateur mis à jour : %s (%s)",
                        user["email"],
                        user["role"],
                    )
                    updated += 1
                else:
                    # Création du compte
                    await conn.execute(
                        """
                        INSERT INTO utilisateur
                            (email, mot_de_passe_hash, nom, prenom,
                             role, actif, email_verifie)
                        VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
                        """,
                        user["email"],
                        hashed,
                        user["nom"],
                        user["prenom"],
                        user["role"],
                    )
                    logger.info(
                        "✅ Utilisateur créé : %s %s <%s> (%s)",
                        user["prenom"],
                        user["nom"],
                        user["email"],
                        user["role"],
                    )
                    created += 1

            except Exception as exc:
                logger.error(
                    "❌ Erreur init utilisateur %s : %s",
                    user["email"],
                    exc,
                )
                errors += 1

    logger.info(
        "👤 Init utilisateurs terminée — créés: %d | mis à jour: %d | erreurs: %d",
        created,
        updated,
        errors,
    )
