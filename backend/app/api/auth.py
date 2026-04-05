from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel, EmailStr
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
# SCHEMAS
# ─────────────────────────────────────────────

class LoginSchema(BaseModel):
    email: EmailStr
    mot_de_passe: str

class MotDePasseOublieSchema(BaseModel):
    email: EmailStr

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
    ip = request.client.host

    # Chercher utilisateur
    user = await db.fetchrow(
        "SELECT * FROM utilisateur WHERE email = $1",
        data.email
    )

    # Message neutre pour sécurité
    err_neutre = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email ou mot de passe incorrect"
    )

    async def journaliser(succes: bool, motif: str = None):
        await db.execute("""
            INSERT INTO journal_connexion
                (id_utilisateur, email_tente,
                 succes, motif_echec, ip_connexion)
            VALUES ($1, $2, $3, $4, $5)
        """,
        user['id'] if user else None,
        data.email, succes, motif, ip)

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
            detail="Compte verrouillé après 5 tentatives. "
                   "Réinitialisez votre mot de passe."
        )

    if not verifier_mdp(data.mot_de_passe,
                        user['mot_de_passe_hash']):
        await journaliser(False, 'mdp_incorrect')
        raise err_neutre

    # Succès
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

    await db.execute("""
        INSERT INTO session_utilisateur
            (id_utilisateur, refresh_token,
             ip_connexion, date_expiration)
        VALUES ($1, $2, $3, $4)
    """, user['id'], refresh_token, ip, expire)

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
            "langue": user['langue']
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
    ip = request.client.host

    # Message toujours identique (sécurité)
    msg_neutre = {
        "message": (
            "Si cet email existe, vous recevrez "
            "un lien de réinitialisation sous peu."
        )
    }

    user = await db.fetchrow(
        "SELECT id, nom, prenom, email, actif "
        "FROM utilisateur WHERE email = $1",
        data.email
    )

    if not user or not user['actif']:
        return msg_neutre

    # Invalider anciens tokens
    await db.execute("""
        UPDATE token_reinitialisation
        SET utilise = TRUE
        WHERE id_utilisateur = $1
        AND type_token = 'reset_mdp'
        AND utilise = FALSE
    """, user['id'])

    # Nouveau token
    token = generer_token_securise()
    expiration = datetime.utcnow() + timedelta(minutes=15)

    await db.execute("""
        INSERT INTO token_reinitialisation
            (id_utilisateur, token, type_token,
             date_expiration, ip_demande)
        VALUES ($1, $2, 'reset_mdp', $3, $4)
    """, user['id'], token, expiration, ip)

    lien = f"https://sig-ftth.ci/reset-password?token={token}"

    # Email en file d'attente
    corps_html = f"""
    <div style="font-family:Arial;background:#0f172a;
                color:#e2e8f0;padding:40px;">
      <div style="max-width:600px;margin:0 auto;
                  background:#1e293b;border-radius:16px;
                  padding:40px;border:1px solid #334155;">
        <div style="text-align:center;font-size:40px;
                    margin-bottom:20px;">🌐📡</div>
        <h2 style="color:#60a5fa;text-align:center;">
          Réinitialisation mot de passe
        </h2>
        <p>Bonjour <strong>
          {user['prenom']} {user['nom']}
        </strong>,</p>
        <p>Vous avez demandé la réinitialisation
           de votre mot de passe SIG FTTH.</p>
        <p style="text-align:center;color:#f87171;">
          ⏱️ Lien valide <strong>15 minutes</strong>
        </p>
        <a href="{lien}"
           style="display:block;background:#2563eb;
                  color:white;text-decoration:none;
                  padding:16px;border-radius:12px;
                  text-align:center;font-weight:bold;
                  margin:24px 0;">
          🔑 Réinitialiser mon mot de passe
        </a>
        <div style="background:#422006;padding:12px;
                    border-radius:8px;color:#fbbf24;
                    font-size:13px;">
          ⚠️ Si vous n'avez pas fait cette demande,
          ignorez cet email. Votre mot de passe
          ne sera pas modifié.<br>
          📍 Demande depuis : {ip}
        </div>
      </div>
    </div>
    """

    await db.execute("""
        INSERT INTO notification_email
            (destinataire_email, destinataire_nom,
             type_email, sujet, corps_html)
        VALUES ($1, $2, 'reset_mdp', $3, $4)
    """,
    user['email'],
    f"{user['prenom']} {user['nom']}",
    "🔑 Réinitialisation mot de passe — SIG FTTH",
    corps_html)

    return msg_neutre

# ─────────────────────────────────────────────
# ENDPOINT : Vérifier token reset
# ─────────────────────────────────────────────

@router.get("/verifier-token/{token}")
async def verifier_token(
    token: str,
    db=Depends(get_db)
):
    token_data = await db.fetchrow("""
        SELECT t.*, u.email, u.nom, u.prenom
        FROM token_reinitialisation t
        JOIN utilisateur u ON u.id = t.id_utilisateur
        WHERE t.token = $1
        AND t.type_token = 'reset_mdp'
    """, token)

    if not token_data:
        raise HTTPException(404, "Lien invalide")

    if token_data['utilise']:
        raise HTTPException(
            410,
            "Ce lien a déjà été utilisé. "
            "Demandez un nouveau lien."
        )

    if token_data['date_expiration'] < datetime.utcnow():
        raise HTTPException(
            410,
            "Ce lien a expiré (15 minutes). "
            "Demandez un nouveau lien."
        )

    temps_restant = int(
        (token_data['date_expiration'] -
         datetime.utcnow()).total_seconds() // 60
    )

    return {
        "valide": True,
        "email": token_data['email'],
        "prenom": token_data['prenom'],
        "temps_restant_min": temps_restant
    }

# ─────────────────────────────────────────────
# ENDPOINT : Réinitialiser mot de passe
# ─────────────────────────────────────────────

@router.post("/reinitialiser-mdp")
async def reinitialiser_mdp(
    data: ReinitialisationSchema,
    db=Depends(get_db)
):
    # Vérifier token
    token_data = await db.fetchrow("""
        SELECT t.*, u.id as user_id,
               u.email, u.nom, u.prenom,
               u.mot_de_passe_hash
        FROM token_reinitialisation t
        JOIN utilisateur u ON u.id = t.id_utilisateur
        WHERE t.token = $1
        AND t.type_token = 'reset_mdp'
        AND t.utilise = FALSE
        AND t.date_expiration > NOW()
    """, data.token)

    if not token_data:
        raise HTTPException(
            400,
            "Lien invalide, expiré ou déjà utilisé."
        )

    if data.nouveau_mdp != data.confirmation_mdp:
        raise HTTPException(
            400,
            "Les mots de passe ne correspondent pas."
        )

    validation = valider_force_mdp(data.nouveau_mdp)
    if not validation['valide']:
        raise HTTPException(400, {
            "message": "Mot de passe trop faible",
            "erreurs": validation['erreurs']
        })

    # Vérifier différent de l'ancien
    if verifier_mdp(data.nouveau_mdp,
                    token_data['mot_de_passe_hash']):
        raise HTTPException(
            400,
            "Le nouveau mot de passe doit être "
            "différent de l'ancien."
        )

    # Sauvegarder nouveau MDP
    nouveau_hash = hasher_mdp(data.nouveau_mdp)
    await db.execute("""
        UPDATE utilisateur
        SET mot_de_passe_hash = $1,
            nb_tentatives_echec = 0,
            compte_verrouille = FALSE,
            date_verrouillage = NULL,
            date_modification = NOW()
        WHERE id = $2
    """, nouveau_hash, token_data['user_id'])

    # Invalider token
    await db.execute("""
        UPDATE token_reinitialisation
        SET utilise = TRUE,
            date_utilisation = NOW()
        WHERE token = $1
    """, data.token)

    # Déconnecter toutes sessions
    await db.execute("""
        UPDATE session_utilisateur
        SET active = FALSE
        WHERE id_utilisateur = $1
    """, token_data['user_id'])

    # Email confirmation
    await db.execute("""
        INSERT INTO notification_email
            (destinataire_email, destinataire_nom,
             type_email, sujet, corps_html)
        VALUES ($1, $2, 'confirmation_reset', $3, $4)
    """,
    token_data['email'],
    f"{token_data['prenom']} {token_data['nom']}",
    "✅ Mot de passe modifié — SIG FTTH",
    f"""
    <div style="font-family:Arial;background:#0f172a;
                color:#e2e8f0;padding:40px;">
      <h2 style="color:#10b981;">
        ✅ Mot de passe modifié avec succès
      </h2>
      <p>Bonjour {token_data['prenom']},</p>
      <p>Votre mot de passe a été modifié.
         Toutes vos sessions ont été déconnectées.</p>
      <div style="background:#422006;padding:12px;
                  border-radius:8px;color:#fbbf24;">
        ⚠️ Si vous n'êtes pas à l'origine de cette
        modification, contactez l'administrateur
        immédiatement.
      </div>
    </div>
    """)

    return {
        "message": "Mot de passe réinitialisé avec succès. "
                   "Vous pouvez vous connecter.",
        "sessions_deconnectees": True
    }

# ─────────────────────────────────────────────
# ENDPOINT : Refresh Token
# ─────────────────────────────────────────────

@router.post("/refresh-token")
async def refresh_token(
    data: RefreshTokenSchema,
    db=Depends(get_db)
):
    session = await db.fetchrow("""
        SELECT s.*, u.id as user_id,
               u.email, u.role,
               u.nom, u.prenom, u.actif
        FROM session_utilisateur s
        JOIN utilisateur u ON u.id = s.id_utilisateur
        WHERE s.refresh_token = $1
        AND s.active = TRUE
        AND s.date_expiration > NOW()
    """, data.refresh_token)

    if not session:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Session expirée. Reconnectez-vous."
        )

    if not session['actif']:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Compte désactivé."
        )

    access_token = creer_access_token({
        "sub": str(session['user_id']),
        "email": session['email'],
        "role": session['role'],
        "nom": session['nom'],
        "prenom": session['prenom']
    })

    await db.execute("""
        UPDATE session_utilisateur
        SET date_derniere_activite = NOW()
        WHERE refresh_token = $1
    """, data.refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

# ─────────────────────────────────────────────
# ENDPOINT : Logout
# ─────────────────────────────────────────────

@router.post("/logout")
async def logout(
    data: RefreshTokenSchema,
    db=Depends(get_db)
):
    await db.execute("""
        UPDATE session_utilisateur
        SET active = FALSE
        WHERE refresh_token = $1
    """, data.refresh_token)

    return {"message": "Déconnexion réussie"}

# ─────────────────────────────────────────────
# ENDPOINT : Profil utilisateur connecté
# ─────────────────────────────────────────────

@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    user = await db.fetchrow("""
        SELECT id, email, nom, prenom,
               role, langue, actif,
               date_derniere_connexion,
               date_creation
        FROM utilisateur
        WHERE id = $1
    """, current_user['sub'])

    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")

    return dict(user)

# ─────────────────────────────────────────────
# ENDPOINT : Changer mot de passe (connecté)
# ─────────────────────────────────────────────

@router.post("/changer-mdp")
async def changer_mdp(
    data: ChangementMdpSchema,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    user = await db.fetchrow("""
        SELECT mot_de_passe_hash
        FROM utilisateur WHERE id = $1
    """, current_user['sub'])

    if not verifier_mdp(data.ancien_mdp,
                        user['mot_de_passe_hash']):
        raise HTTPException(
            400,
            "Ancien mot de passe incorrect"
        )

    if data.nouveau_mdp != data.confirmation_mdp:
        raise HTTPException(
            400,
            "Les mots de passe ne correspondent pas"
        )

    validation = valider_force_mdp(data.nouveau_mdp)
    if not validation['valide']:
        raise HTTPException(400, {
            "message": "Mot de passe trop faible",
            "erreurs": validation['erreurs']
        })

    nouveau_hash = hasher_mdp(data.nouveau_mdp)
    await db.execute("""
        UPDATE utilisateur
        SET mot_de_passe_hash = $1,
            date_modification = NOW()
        WHERE id = $2
    """, nouveau_hash, current_user['sub'])

    return {"message": "Mot de passe modifié avec succès"}

# ─────────────────────────────────────────────
# ENDPOINT : Déverrouiller compte (Admin)
# ─────────────────────────────────────────────

@router.post("/deverrouiller/{user_id}")
async def deverrouiller_compte(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user.get('role') != 'admin':
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Réservé aux administrateurs"
        )

    await db.execute("""
        UPDATE utilisateur
        SET compte_verrouille = FALSE,
            nb_tentatives_echec = 0,
            date_verrouillage = NULL,
            date_modification = NOW()
        WHERE id = $1
    """, user_id)

    return {"message": "Compte déverrouillé avec succès"}

# ─────────────────────────────────────────────
# ENDPOINT : Journal connexions (Admin)
# ─────────────────────────────────────────────

@router.get("/journal-connexions")
async def journal_connexions(
    limite: int = 50,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user.get('role') != 'admin':
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Réservé aux administrateurs"
        )

    rows = await db.fetch("""
        SELECT j.*, u.email, u.nom, u.prenom
        FROM journal_connexion j
        LEFT JOIN utilisateur u ON u.id = j.id_utilisateur
        ORDER BY j.date_tentative DESC
        LIMIT $1
    """, limite)

    return [dict(r) for r in rows]
