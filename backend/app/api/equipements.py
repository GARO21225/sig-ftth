from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import io, base64, json, secrets
from app.core.database import get_db
from app.core.security import get_current_user, require_role

router = APIRouter()


# ── EQUIPEMENTS ─────────────────────────────────────────────────

equip_router = APIRouter(prefix="/equipements")

class EquipementCreate(BaseModel):
    nom_unique: str
    id_type_equipement: str
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    etat: Optional[str] = "actif"
    marque: Optional[str] = None
    modele: Optional[str] = None
    numero_serie: Optional[str] = None
    commentaire: Optional[str] = None
    id_noeud_telecom: Optional[str] = None
    id_noeud_gc: Optional[str] = None

class EquipementUpdate(BaseModel):
    etat: Optional[str] = None
    marque: Optional[str] = None
    modele: Optional[str] = None
    numero_serie: Optional[str] = None
    commentaire: Optional[str] = None
    attributs_custom: Optional[dict] = None

@equip_router.get("")
async def lister_equipements(
    type_eq: Optional[str] = None,
    etat: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    where, params = "WHERE 1=1", []
    if type_eq:
        params.append(type_eq); where += f" AND te.code = ${len(params)}"
    if etat:
        params.append(etat); where += f" AND e.etat = ${len(params)}"
    rows = await db.fetch(f"""
        SELECT e.id, e.nom_unique, e.etat, e.marque, e.modele,
               e.numero_serie, e.commentaire, e.date_creation,
               te.code AS type_code, te.nom AS type_nom, te.icone,
               ST_X(e.geom_point) AS longitude, ST_Y(e.geom_point) AS latitude
        FROM equipement e
        JOIN type_equipement te ON e.id_type_equipement = te.id
        {where}
        ORDER BY e.date_creation DESC
        LIMIT 500
    """, *params)
    return [dict(r) for r in rows]

@equip_router.get("/geojson")
async def equipements_geojson(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT e.id, e.nom_unique, e.etat,
               te.code, te.icone, te.couleur,
               ST_AsGeoJSON(e.geom_point)::json AS geometry
        FROM equipement e
        JOIN type_equipement te ON e.id_type_equipement = te.id
        WHERE e.geom_point IS NOT NULL
    """)
    features = [{"type":"Feature","geometry":r["geometry"],"properties":{
        "id":str(r["id"]),"nom_unique":r["nom_unique"],
        "code":r["code"],"icone":r["icone"],"etat":r["etat"]
    }} for r in rows]
    return {"type":"FeatureCollection","features":features}

@equip_router.get("/types")
async def types_equipements(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    rows = await db.fetch("""
        SELECT te.*, ce.nom AS categorie_nom
        FROM type_equipement te
        LEFT JOIN categorie_equipement ce ON te.id_categorie = ce.id
        WHERE te.statut = 'valide'
        ORDER BY ce.nom, te.code
    """)
    return [dict(r) for r in rows]

@equip_router.get("/{eq_id}")
async def detail_equipement(eq_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    row = await db.fetchrow("""
        SELECT e.*, te.code AS type_code, te.nom AS type_nom,
               ST_X(e.geom_point) AS longitude, ST_Y(e.geom_point) AS latitude
        FROM equipement e
        JOIN type_equipement te ON e.id_type_equipement = te.id
        WHERE e.id = $1
    """, eq_id)
    if not row: raise HTTPException(404, "Équipement introuvable")
    return dict(row)

@equip_router.post("")
async def creer_equipement(
    data: EquipementCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in ['admin','chef_projet','technicien']:
        raise HTTPException(403, "Permission refusée")
    existe = await db.fetchrow("SELECT id FROM equipement WHERE nom_unique=$1", data.nom_unique)
    if existe: raise HTTPException(400, f"Équipement '{data.nom_unique}' existe déjà")
    type_ok = await db.fetchrow("SELECT id FROM type_equipement WHERE id=$1", data.id_type_equipement)
    if not type_ok: raise HTTPException(400, "Type équipement invalide")

    geom_expr = "ST_SetSRID(ST_MakePoint($3,$4),4326)" if data.longitude else "NULL"
    row = await db.fetchrow(f"""
        INSERT INTO equipement
            (nom_unique, id_type_equipement, geom_point, etat, marque,
             modele, numero_serie, commentaire, id_noeud_telecom, id_noeud_gc, cree_par)
        VALUES ($1,$2,{geom_expr},${'5' if data.longitude else '3'},${'6' if data.longitude else '4'},
                ${'7' if data.longitude else '5'},${'8' if data.longitude else '6'},
                ${'9' if data.longitude else '7'},${'10' if data.longitude else '8'})
        RETURNING id, nom_unique, etat
    """, data.nom_unique, data.id_type_equipement,
    *([data.longitude, data.latitude] if data.longitude else []),
    data.etat, data.marque, data.modele, data.numero_serie,
    data.commentaire, data.id_noeud_telecom, data.id_noeud_gc)
    return dict(row)

@equip_router.put("/{eq_id}")
async def modifier_equipement(eq_id: str, data: EquipementUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    if current_user['role'] not in ['admin','chef_projet','technicien']:
        raise HTTPException(403, "Permission refusée")
    updates, params = [], [eq_id]
    for field, val in data.dict().items():
        if val is not None:
            params.append(val if field != 'attributs_custom' else json.dumps(val))
            updates.append(f"{field} = ${len(params)}")
    if not updates: raise HTTPException(400, "Aucun champ à modifier")
    await db.execute(f"UPDATE equipement SET {', '.join(updates)} WHERE id=$1", *params)
    return {"status":"ok","id":eq_id}

@equip_router.delete("/{eq_id}")
async def supprimer_equipement(eq_id: str, current_user: dict = Depends(require_role("admin","chef_projet")), db=Depends(get_db)):
    eq = await db.fetchrow("SELECT id FROM equipement WHERE id=$1", eq_id)
    if not eq: raise HTTPException(404, "Équipement introuvable")
    await db.execute("DELETE FROM equipement WHERE id=$1", eq_id)
    return {"status":"ok"}

# ── QR CODES ─────────────────────────────────────────────────────

@equip_router.get("/{eq_id}/qr-code")
async def generer_qr_noeud(eq_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    try:
        import qrcode
        import qrcode.image.pure
        url = f"https://garo21225.github.io/sig-ftth/scan/{eq_id}"
        qr = qrcode.QRCode(version=1, box_size=8, border=3,
                           image_factory=qrcode.image.pure.PyPNGImage)
        qr.add_data(url)
        qr.make(fit=True)
        buf = io.BytesIO()
        qr.make_image().save(buf)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return {"qr_base64": f"data:image/png;base64,{b64}", "url": url, "id": eq_id}
    except Exception as e:
        # Fallback: retourner juste l'URL si qrcode non dispo
        url = f"https://garo21225.github.io/sig-ftth/scan/{eq_id}"
        return {"qr_base64": None, "url": url, "id": eq_id, "warning": str(e)}

# ── PHOTOS ÉQUIPEMENTS ───────────────────────────────────────────

@equip_router.post("/{noeud_id}/photos")
async def ajouter_photo(
    noeud_id: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    commentaire: Optional[str] = None,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    url = f"data:{file.content_type};base64,{b64}"
    photo_id = await db.fetchval("""
        INSERT INTO photo_equipement
            (id_noeud, url, nom_fichier, latitude, longitude, commentaire, auteur)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
    """, noeud_id, url, file.filename, lat, lng, commentaire, current_user['sub'])
    return {"id": str(photo_id), "message": "Photo enregistrée"}

@equip_router.get("/{noeud_id}/photos")
async def photos_noeud(noeud_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    rows = await db.fetch("""
        SELECT id, url, nom_fichier, latitude, longitude, commentaire, date_creation
        FROM photo_equipement WHERE id_noeud=$1
        ORDER BY date_creation DESC
    """, noeud_id)
    return [dict(r) for r in rows]

router.include_router(equip_router)
