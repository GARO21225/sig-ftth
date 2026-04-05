from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import re

from app.core.database import get_db
from app.core.security import (
    hasher_mdp, verifier_mdp,
    creer_access_token, creer_refresh_token,
    generer_token_securise, get_current_user
)
from app.core.config import settings

router = APIRouter()

# ─────────────────────────────────────────────
# SCHEMAS — email: str (EmailStr supprimé → pas de email-validator requis)
# ─────────────────────────────────────────────

class LoginSchema(BaseModel):
    email: str
    mot_de_passe: str

class MotDePasseOublieSchema(BaseModel):
    email: str

class ReinitialisationSchema(BaseModel):
    token: str
    nouveau_mdp: str
    confirmation_mdp: str

class RefreshTokenSchema(BaseModel):
    refresh_token: str

class ChangementMdpSchema(BaseModel):
    ancien_mdp: str
    nouveau_mdp: str
    confirmation_mdp: str

# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────

def valider_email(email: str) -> bool:
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))

def valider_force_mdp(mdp: str) -> dict:
    erreurs = []
    if len(mdp) < 8:
        erreurs.append("Minimum 8 caractères")
    if not re.search(r'[A-Z]', mdp):
        erreurs.append("Au moins une majuscule")
    if not re.search(r'[a-z]', mdp):
        erreurs.append("Au moins une minuscule")
    if not re.search(r'\d', mdp):
        erreurs.append("Au moins un chiffre")
    if not re.search(r'[!@#$%^&*(),.?]', mdp):
        erreurs.append("Au moins un caractère spécial")
    score = 5 - len(erreurs)
    return {
        "valide": len(erreurs) == 0,
        "erreurs": erreurs,
        "score": score,
        "force": (
            "tres_faible" if score <= 1 else
            "faible"      if score == 2 else
            "moyen"       if score == 3 else
            "fort"        if score == 4 else
            "tres_fort"
        )
    }

# ─────────────────────────────────────────────
# ENDPOINT : Login
# ─────────────────────────────────────────────

@router.post("/login")
async def login(
    data: LoginSchema,
    request: Request,
    db=Depends(get_db)
):
    if not valider_email(data.email):
        raise HTTPException(status_code=400, detail="Email invalide")

    ip = request.client.host if request.client else "unknown"

    from sqlalchemy import text
result = await db.execute(
    text("SELECT * FROM utilisateurs WHERE email = :email"),
    {"email": email}
)
user = result.fetchone()

    err_neutre = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email ou mot de passe incorrect"
    )

    async def journaliser(succes: bool, motif: str = None):
        try:
            await db.execute("""
                INSERT INTO journal_connexion
                    (id_utilisateur, email_tente,
                     succes, motif_echec, ip_connexion)
                VALUES ($1, $2, $3, $4, $5)
            """,
            user['id'] if user else None,
            data.email, succes, motif, ip)
        except Exception:
            pass  # Ne pas crasher si la table n'existe pas encore

    if not user:
        await journaliser(False, 'compte_inexistant')
        raise err_neutre

    if not user['actif']:
        await journaliser(False, 'compte_inactif')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )

    if user['compte_verrouille']:
        await journaliser(False, 'compte_verrouille')
        raise HTTPException(
            status_code=423,
            detail="Compte verrouillé après 5 tentatives. Réinitialisez votre mot de passe."
        )

    if not verifier_mdp(data.mot_de_passe, user['mot_de_passe_hash']):
        await journaliser(False, 'mdp_incorrect')
        raise err_neutre

    await journaliser(True)

    access_token = creer_access_token({
        "sub": str(user['id']),
        "email": user['email'],
        "role": user['role'],
        "nom": user['nom'],
        "prenom": user['prenom']
    })

    refresh_token = creer_refresh_token()
    expire = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    try:
        await db.execute("""
            INSERT INTO session_utilisateur
                (id_utilisateur, refresh_token,
                 ip_connexion, date_expiration)
            VALUES ($1, $2, $3, $4)
        """, user['id'], refresh_token, ip, expire)
    except Exception:
        pass

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user['id']),
            "nom": user['nom'],
            "prenom": user['prenom'],
            "email": user['email'],
            "role": user['role'],
            "langue": user.get('langue', 'fr')
        }
    }

# ─────────────────────────────────────────────
# ENDPOINT : Mot de passe oublié
# ─────────────────────────────────────────────

@router.post("/mot-de-passe-oublie")
async def mot_de_passe_oublie(
    data: MotDePasseOublieSchema,
    request: Request,
    db=Depends(get_db)
):
    msg_neutre = {
        "message": "Si cet email existe, vous recevrez un lien de réinitialisation sous peu."
    }
    try:
        user = await db.fetchrow(
            "SELECT id, nom, prenom, email, actif FROM utilisateur WHERE email = $1",
            data.email
        )
        if not user or not user['actif']:
            return msg_neutre

        token = generer_token_securise()
        expiration = datetime.utcnow() + timedelta(minutes=15)

        await db.execute("""
            INSERT INTO token_reinitialisation
                (id_utilisateur, token, type_token, date_expiration, ip_demande)
            VALUES ($1, $2, 'reset_mdp', $3, $4)
        """, user['id'], token, expiration,
            request.client.host if request.client else "unknown")
    except Exception:
        pass
    return msg_neutre

# ─────────────────────────────────────────────
# ENDPOINT : Réinitialiser mot de passe
# ─────────────────────────────────────────────

@router.post("/reinitialiser-mdp")
async def reinitialiser_mdp(
    data: ReinitialisationSchema,
    db=Depends(get_db)
):
    token_data = await db.fetchrow("""
        SELECT t.*, u.id as user_id, u.email, u.mot_de_passe_hash
        FROM token_reinitialisation t
        JOIN utilisateur u ON u.id = t.id_utilisateur
        WHERE t.token = $1 AND t.type_token = 'reset_mdp'
        AND t.utilise = FALSE AND t.date_expiration > NOW()
    """, data.token)

    if not token_data:
        raise HTTPException(400, "Lien invalide, expiré ou déjà utilisé.")

    if data.nouveau_mdp != data.confirmation_mdp:
        raise HTTPException(400, "Les mots de passe ne correspondent pas.")

    validation = valider_force_mdp(data.nouveau_mdp)
    if not validation['valide']:
        raise HTTPException(400, str(validation['erreurs']))

    nouveau_hash = hasher_mdp(data.nouveau_mdp)
    await db.execute("""
        UPDATE utilisateur
        SET mot_de_passe_hash = $1, nb_tentatives_echec = 0,
            compte_verrouille = FALSE, date_modification = NOW()
        WHERE id = $2
    """, nouveau_hash, token_data['user_id'])

    await db.execute("""
        UPDATE token_reinitialisation
        SET utilise = TRUE, date_utilisation = NOW()
        WHERE token = $1
    """, data.token)

    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter."}

# ─────────────────────────────────────────────
# ENDPOINT : Refresh Token
# ─────────────────────────────────────────────

@router.post("/refresh-token")
async def refresh_token(
    data: RefreshTokenSchema,
    db=Depends(get_db)
):
    session = await db.fetchrow("""
        SELECT s.*, u.id as user_id, u.email, u.role,
               u.nom, u.prenom, u.actif
        FROM session_utilisateur s
        JOIN utilisateur u ON u.id = s.id_utilisateur
        WHERE s.refresh_token = $1
        AND s.active = TRUE AND s.date_expiration > NOW()
    """, data.refresh_token)

    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expirée. Reconnectez-vous.")

    if not session['actif']:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Compte désactivé.")

    access_token = creer_access_token({
        "sub": str(session['user_id']),
        "email": session['email'],
        "role": session['role'],
        "nom": session['nom'],
        "prenom": session['prenom']
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

# ─────────────────────────────────────────────
# ENDPOINT : Logout
# ─────────────────────────────────────────────

@router.post("/logout")
async def logout(data: RefreshTokenSchema, db=Depends(get_db)):
    try:
        await db.execute(
            "UPDATE session_utilisateur SET active = FALSE WHERE refresh_token = $1",
            data.refresh_token
        )
    except Exception:
        pass
    return {"message": "Déconnexion réussie"}

# ─────────────────────────────────────────────
# ENDPOINT : Profil
# ─────────────────────────────────────────────

@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    user = await db.fetchrow("""
        SELECT id, email, nom, prenom, role, langue, actif,
               date_derniere_connexion, date_creation
        FROM utilisateur WHERE id = $1
    """, current_user['sub'])

    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    return dict(user)
