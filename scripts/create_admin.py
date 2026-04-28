#!/usr/bin/env python3
"""
Créer le premier compte admin en base PostgreSQL.
Usage : python scripts/create_admin.py
"""
import asyncio
import asyncpg
import os
import sys
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    # Lire DATABASE_URL depuis env ou .env
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        env_file = os.path.join(os.path.dirname(__file__), "../backend/.env")
        if os.path.exists(env_file):
            with open(env_file) as f:
                for line in f:
                    if line.startswith("DATABASE_URL="):
                        db_url = line.strip().split("=", 1)[1]
                        break

    if not db_url:
        print("❌ DATABASE_URL non trouvé")
        sys.exit(1)

    # Normaliser pour asyncpg (pas de +asyncpg dans l'URL)
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    db_url = db_url.replace("postgres://", "postgresql://")

    # Données admin
    email    = input("Email admin [admin@sig-ftth.ci] : ").strip() or "admin@sig-ftth.ci"
    password = input("Mot de passe [Admin@1234!] : ").strip() or "Admin@1234!"
    nom      = input("Nom [KOUAME] : ").strip() or "KOUAME"
    prenom   = input("Prénom [Edgar] : ").strip() or "Edgar"

    hash_mdp = pwd_context.hash(password)

    conn = await asyncpg.connect(db_url)
    try:
        # Vérifier si déjà existant
        exists = await conn.fetchval(
            "SELECT COUNT(*) FROM utilisateur WHERE email = $1", email
        )
        if exists:
            print(f"⚠️ Utilisateur {email} existe déjà.")
            update = input("Mettre à jour le mot de passe ? (o/n) : ")
            if update.lower() == 'o':
                await conn.execute(
                    "UPDATE utilisateur SET mot_de_passe_hash=$1 WHERE email=$2",
                    hash_mdp, email
                )
                print(f"✅ Mot de passe mis à jour pour {email}")
        else:
            await conn.execute("""
                INSERT INTO utilisateur (
                    email, mot_de_passe_hash, nom, prenom,
                    role, actif, email_verifie
                ) VALUES ($1, $2, $3, $4, 'admin', true, true)
            """, email, hash_mdp, nom, prenom)
            print(f"✅ Admin créé : {prenom} {nom} ({email})")

        # Afficher tous les utilisateurs
        users = await conn.fetch(
            "SELECT email, nom, prenom, role, actif FROM utilisateur ORDER BY role"
        )
        print("\n📋 Utilisateurs en base :")
        for u in users:
            print(f"  {'✅' if u['actif'] else '❌'} [{u['role']:15}] {u['prenom']} {u['nom']} — {u['email']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
