"""
API Publique — Clés API pour QGIS, ArcGIS, Power BI
Rate limiting simple basé sur quota_jour en base
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
import secrets
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from datetime import date

router = APIRouter(prefix="/public")
admin_router = APIRouter(prefix="/api-keys")


async def verifier_cle(x_api_key: str = Header(...), db=Depends(get_db)):
    """Middleware validation clé API"""
    cle = await db.fetchrow("""
        SELECT id, nom_client, permissions, quota_jour, nb_appels_jour,
               date_reset_quota, actif
        FROM api_keys WHERE cle = $1
    """, x_api_key)
    if not cle or not cle['actif']:
        raise HTTPException(401, "Clé API invalide ou désactivée")

    # Reset quota quotidien
    today = date.today()
    if cle['date_reset_quota'] < today:
        await db.execute(
            "UPDATE api_keys SET nb_appels_jour=0, date_reset_quota=$1 WHERE cle=$2",
            today, x_api_key
        )
        nb_appels = 0
    else:
        nb_appels = cle['nb_appels_jour']

    if nb_appels >= cle['quota_jour']:
        raise HTTPException(429, f"Quota journalier dépassé ({cle['quota_jour']} appels/jour)")

    await db.execute("""
        UPDATE api_keys
        SET nb_appels_jour = nb_appels_jour + 1,
            date_derniere_utilisation = NOW()
        WHERE cle = $1
    """, x_api_key)
    return cle


# ── ENDPOINTS PUBLICS (lecture seule) ────────────────────────────

@router.get("/noeuds-telecom")
async def api_pub_noeuds(
    type_noeud: Optional[str] = None,
    db=Depends(get_db),
    cle=Depends(verifier_cle)
):
    where = "WHERE 1=1"
    params = []
    if type_noeud:
        params.append(type_noeud); where += f" AND type_noeud = ${len(params)}"
    rows = await db.fetch(f"""
        SELECT id, nom_unique, type_noeud, etat,
               ST_X(geom) AS longitude, ST_Y(geom) AS latitude,
               capacite_fibres_max,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM noeud_telecom {where}
        LIMIT 5000
    """, *params)
    return {"type":"FeatureCollection","features":[{
        "type":"Feature","geometry":r["geometry"],
        "properties":{k:v for k,v in dict(r).items() if k != "geometry"}
    } for r in rows]}

@router.get("/liens-telecom")
async def api_pub_liens(db=Depends(get_db), cle=Depends(verifier_cle)):
    rows = await db.fetch("""
        SELECT id, nom_unique, type_lien, longueur_m, etat,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM lien_telecom WHERE geom IS NOT NULL LIMIT 5000
    """)
    return {"type":"FeatureCollection","features":[{
        "type":"Feature","geometry":r["geometry"],
        "properties":{k:v for k,v in dict(r).items() if k != "geometry"}
    } for r in rows]}

@router.get("/zones-influence")
async def api_pub_zones(db=Depends(get_db), cle=Depends(verifier_cle)):
    rows = await db.fetch("""
        SELECT id, nom, code, type_zone, statut, nb_clients_actifs,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM zone_influence WHERE statut='active' LIMIT 500
    """)
    return {"type":"FeatureCollection","features":[{
        "type":"Feature","geometry":r["geometry"],
        "properties":{k:v for k,v in dict(r).items() if k != "geometry"}
    } for r in rows]}

@router.get("/kpi")
async def api_pub_kpi(db=Depends(get_db), cle=Depends(verifier_cle)):
    try:
        kpi = await db.fetchrow("SELECT * FROM kpi_dashboard")
        return dict(kpi) if kpi else {}
    except Exception:
        return {}


# ── GESTION CLÉS API (admin) ──────────────────────────────────────

class CreerCleSchema(BaseModel):
    nom_client: str
    email_contact: Optional[str] = None
    permissions: Optional[list] = ["read"]
    quota_jour: Optional[int] = 1000

@admin_router.get("")
async def lister_cles(current_user: dict = Depends(require_role("admin")), db=Depends(get_db)):
    rows = await db.fetch("""
        SELECT id, cle, nom_client, email_contact, permissions,
               quota_jour, nb_appels_jour, actif, date_creation, date_derniere_utilisation
        FROM api_keys ORDER BY date_creation DESC
    """)
    # Masquer la clé partiellement
    result = []
    for r in rows:
        d = dict(r)
        d['cle_masquee'] = d['cle'][:8] + '...' + d['cle'][-4:]
        result.append(d)
    return result

@admin_router.post("")
async def creer_cle(
    data: CreerCleSchema,
    current_user: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    import json
    cle = secrets.token_hex(32)
    row = await db.fetchrow("""
        INSERT INTO api_keys (cle, nom_client, email_contact, permissions, quota_jour, cree_par)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, cle, nom_client
    """, cle, data.nom_client, data.email_contact,
        json.dumps(data.permissions), data.quota_jour, current_user['sub'])
    return {"message": "Clé créée — conservez-la précieusement", "cle": cle, "client": data.nom_client}

@admin_router.delete("/{cle_id}")
async def revoquer_cle(cle_id: str, current_user: dict = Depends(require_role("admin")), db=Depends(get_db)):
    await db.execute("UPDATE api_keys SET actif=FALSE WHERE id=$1", cle_id)
    return {"status":"ok","message":"Clé révoquée"}
