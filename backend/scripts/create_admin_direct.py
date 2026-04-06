#!/usr/bin/env python3
"""
Script de création directe d'un compte administrateur.

Usage (depuis le répertoire backend/) :
    DATABASE_URL=postgresql://... python scripts/create_admin_direct.py

Railway injecte DATABASE_URL automatiquement dans l'environnement du service,
donc ce script peut être exécuté directement via "railway run" :
    railway run python scripts/create_admin_direct.py
"""

import asyncio
import os
import sys
import re

# ── Dépendances : asyncpg + passlib (déjà dans requirements.txt) ──────────────
try:
    import asyncpg
except ImportError:
    print("❌ asyncpg non installé. Lancez : pip install asyncpg")
    sys.exit(1)

try:
    from passlib.context import CryptContext
except ImportError:
    print("❌ passlib non installé. Lancez : pip install passlib[bcrypt]")
    sys.exit(1)

# ── Paramètres du compte admin à créer ───────────────────────────────────────
ADMIN_EMAIL   = "admin@sig-ftth.ci"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_NOM     = "KOUAME"
ADMIN_PRENOM  = "Edgar"
ADMIN_ROLE    = "admin"
ADMIN_LANGUE  = "fr"

# ── Hachage bcrypt (identique à app/core/security.py) ────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hasher_mdp(mdp: str) -> str:
    return pwd_context.hash(mdp)


def normaliser_database_url(url: str) -> str:
    """
    asyncpg attend 'postgresql://...' ou 'postgres://...'.
    Supprime les préfixes SQLAlchemy (+asyncpg) si présents.
    """
    url = url.strip()
    # Retirer le driver asyncpg ajouté par SQLAlchemy
    url = re.sub(r"^postgresql\+asyncpg://", "postgresql://", url)
    url = re.sub(r"^postgres\+asyncpg://",   "postgresql://", url)
    # Railway utilise parfois 'postgres://' — asyncpg l'accepte tel quel
    return url


async def creer_admin():
    # ── 1. Récupérer DATABASE_URL ─────────────────────────────────────────────
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("❌ Variable d'environnement DATABASE_URL introuvable.")
        print("   Définissez-la avant de lancer le script :")
        print("   DATABASE_URL=postgresql://user:pass@host:5432/db python scripts/create_admin_direct.py")
        sys.exit(1)

    dsn = normaliser_database_url(database_url)
    print(f"🔌 Connexion à la base de données…")

    # ── 2. Connexion directe via asyncpg ─────────────────────────────────────
    try:
        conn = await asyncpg.connect(dsn)
    except Exception as e:
        print(f"❌ Impossible de se connecter à la base : {e}")
        sys.exit(1)

    print("✅ Connexion établie.")

    try:
        # ── 3. Vérifier si l'email existe déjà ───────────────────────────────
        existing = await conn.fetchrow(
            "SELECT id, role, actif FROM utilisateur WHERE email = $1",
            ADMIN_EMAIL
        )

        if existing:
            print(f"\n⚠️  Un compte avec l'email '{ADMIN_EMAIL}' existe déjà.")
            print(f"   ID   : {existing['id']}")
            print(f"   Rôle : {existing['role']}")
            print(f"   Actif: {existing['actif']}")
            print("\n🔄 Mise à jour du mot de passe, du rôle et activation du compte…")

            mot_de_passe_hash = hasher_mdp(ADMIN_PASSWORD)
            await conn.execute("""
                UPDATE utilisateur
                SET
                    mot_de_passe_hash  = $1,
                    role               = $2,
                    nom                = $3,
                    prenom             = $4,
                    actif              = TRUE,
                    compte_verrouille  = FALSE,
                    nb_tentatives_echec = 0,
                    date_modification  = NOW()
                WHERE email = $5
            """,
                mot_de_passe_hash,
                ADMIN_ROLE,
                ADMIN_NOM,
                ADMIN_PRENOM,
                ADMIN_EMAIL,
            )
            print("✅ Compte mis à jour avec succès.")

        else:
            # ── 4. Créer le compte admin ──────────────────────────────────────
            print(f"\n➕ Création du compte admin '{ADMIN_EMAIL}'…")
            mot_de_passe_hash = hasher_mdp(ADMIN_PASSWORD)

            user_id = await conn.fetchval("""
                INSERT INTO utilisateur (
                    email,
                    mot_de_passe_hash,
                    nom,
                    prenom,
                    role,
                    langue,
                    actif,
                    compte_verrouille,
                    nb_tentatives_echec,
                    date_creation,
                    date_modification
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    TRUE, FALSE, 0,
                    NOW(), NOW()
                )
                RETURNING id
            """,
                ADMIN_EMAIL,
                mot_de_passe_hash,
                ADMIN_NOM,
                ADMIN_PRENOM,
                ADMIN_ROLE,
                ADMIN_LANGUE,
            )
            print(f"✅ Compte admin créé avec succès (ID : {user_id}).")

        # ── 5. Résumé ─────────────────────────────────────────────────────────
        print("\n" + "─" * 50)
        print("📋 Récapitulatif du compte administrateur :")
        print(f"   Email    : {ADMIN_EMAIL}")
        print(f"   Mot de passe : {ADMIN_PASSWORD}")
        print(f"   Nom      : {ADMIN_NOM}")
        print(f"   Prénom   : {ADMIN_PRENOM}")
        print(f"   Rôle     : {ADMIN_ROLE}")
        print("─" * 50)
        print("🎉 Vous pouvez maintenant vous connecter via l'interface.")

    except asyncpg.exceptions.UndefinedTableError:
        print("❌ La table 'utilisateur' n'existe pas encore.")
        print("   Assurez-vous que les migrations ont été appliquées (init_db).")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erreur lors de la création du compte : {e}")
        sys.exit(1)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(creer_admin())
