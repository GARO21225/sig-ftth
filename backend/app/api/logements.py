from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_delete

router = APIRouter(prefix="/logements")

class LogementCreate(BaseModel):
    nom_unique: str
    id_type_logement: str
    longitude: float
    latitude: float
    adresse: Optional[str] = None
    quartier: Optional[str] = None
    commune: Optional[str] = None
    nb_el_reel: int = 1
    nb_el_raccordables: Optional[int] = None
    statut_ftth: Optional[str] = "non_prevu"
    id_pbo: Optional[str] = None
    commentaire: Optional[str] = None

class LogementUpdate(BaseModel):
    statut_ftth: Optional[str] = None
    nb_el_reel: Optional[int] = None
    nb_el_raccordables: Optional[int] = None
    nb_el_raccordes: Optional[int] = None
    nb_el_en_cours: Optional[int] = None
    id_pbo: Optional[str] = None
    commentaire: Optional[str] = None

@router.get("")
async def liste_logements(
    statut_ftth: Optional[str] = None,
    commune: Optional[str] = None,
    groupe: Optional[str] = None,
    bbox: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT
            l.id, l.nom_unique,
            ST_X(l.geom) AS longitude,
            ST_Y(l.geom) AS latitude,
            l.adresse, l.quartier, l.commune,
            l.nb_el_reel, l.nb_el_raccordables,
            l.nb_el_raccordes, l.nb_el_en_cours,
            l.statut_ftth, l.date_creation,
            tl.code AS type_code,
            tl.nom AS type_nom,
            tl.icone, tl.couleur,
            tl.el_moyen,
            g.code AS groupe_code,
            g.nom AS groupe_nom
        FROM logement l
        JOIN type_logement tl
            ON tl.id = l.id_type_logement
        JOIN groupe_logement g
            ON g.id = tl.id_groupe
        WHERE 1=1
    """
    params = []
    i = 1

    if statut_ftth:
        query += f" AND l.statut_ftth = ${i}"
        params.append(statut_ftth)
        i += 1

    if commune:
        query += f" AND l.commune ILIKE ${i}"
        params.append(f"%{commune}%")
        i += 1

    if groupe:
        query += f" AND g.code = ${i}"
        params.append(groupe)
        i += 1

    if bbox:
        coords = [float(x) for x in bbox.split(',')]
        query += f"""
            AND ST_Within(l.geom,
                ST_MakeEnvelope(
                    ${i},${i+1},${i+2},${i+3},4326
                )
            )
        """
        params.extend(coords)

    query += " ORDER BY l.nom_unique LIMIT 500"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/geojson")
async def logements_geojson(
    statut_ftth: Optional[str] = None,
    groupe: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry',
                        ST_AsGeoJSON(l.geom)::json,
                    'properties', json_build_object(
                        'id', l.id,
                        'nom_unique', l.nom_unique,
                        'statut_ftth', l.statut_ftth,
                        'nb_el_reel', l.nb_el_reel,
                        'nb_el_raccordes',
                            l.nb_el_raccordes,
                        'type_nom', tl.nom,
                        'groupe_code', g.code,
                        'icone', tl.icone,
                        'couleur', tl.couleur,
                        'commune', l.commune
                    )
                )
            ), '[]'::json)
        ) AS geojson
        FROM logement l
        JOIN type_logement tl
            ON tl.id = l.id_type_logement
        JOIN groupe_logement g
            ON g.id = tl.id_groupe
        WHERE 1=1
    """
    params = []
    i = 1

    if statut_ftth:
        query += f" AND l.statut_ftth = ${i}"
        params.append(statut_ftth)
        i += 1

    if groupe:
        query += f" AND g.code = ${i}"
        params.append(groupe)

    row = await db.fetchrow(query, *params)
    return row['geojson']

@router.post("")
async def creer_logement(
    data: LogementCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin','chef_projet','technicien'
    ]:
        raise HTTPException(403, "Permission refusée")

    existe = await db.fetchrow(
        "SELECT id FROM logement WHERE nom_unique=$1",
        data.nom_unique
    )
    if existe:
        raise HTTPException(
            400,
            f"Un logement '{data.nom_unique}' existe déjà"
        )

    row = await db.fetchrow("""
        INSERT INTO logement
            (nom_unique, id_type_logement, geom,
             adresse, quartier, commune,
             nb_el_reel, nb_el_raccordables,
             statut_ftth, id_pbo,
             commentaire, cree_par)
        VALUES (
            $1,$2,
            ST_SetSRID(ST_MakePoint($3,$4),4326),
            $5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        RETURNING id, nom_unique, statut_ftth
    """,
    data.nom_unique, data.id_type_logement,
    data.longitude, data.latitude,
    data.adresse, data.quartier, data.commune,
    data.nb_el_reel, data.nb_el_raccordables,
    data.statut_ftth, data.id_pbo,
    data.commentaire, current_user['sub'])

    await cache_delete("dashboard:*")
    return dict(row)

@router.put("/{logement_id}")
async def modifier_logement(
    logement_id: str,
    data: LogementUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    champs = {k: v for k, v in data.dict().items()
              if v is not None}
    if not champs:
        raise HTTPException(400, "Aucun champ à modifier")

    set_clause = ", ".join(
        f"{k} = ${i+2}"
        for i, k in enumerate(champs.keys())
    )
    values = list(champs.values())

    await db.execute(
        f"UPDATE logement "
        f"SET {set_clause}, date_modification=NOW() "
        f"WHERE id = $1",
        logement_id, *values
    )

    await cache_delete("dashboard:*")
    return {"message": "Logement modifié avec succès"}

@router.get("/types")
async def types_logement(
    groupe: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT tl.*, g.code AS groupe_code,
               g.nom AS groupe_nom,
               g.icone AS groupe_icone
        FROM type_logement tl
        JOIN groupe_logement g ON g.id = tl.id_groupe
        WHERE tl.actif = TRUE
    """
    params = []
    if groupe:
        query += " AND g.code = $1"
        params.append(groupe)

    query += " ORDER BY g.ordre_affichage, tl.nom"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/groupes")
async def groupes_logement(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT * FROM groupe_logement
        ORDER BY ordre_affichage
    """)
    return [dict(r) for r in rows]

@router.get("/{logement_id}")
async def detail_logement(
    logement_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT l.*, ST_X(l.geom) AS longitude, ST_Y(l.geom) AS latitude,
               tl.nom AS type_nom, gl.nom AS groupe_nom
        FROM logement l
        LEFT JOIN type_logement tl ON l.id_type_logement = tl.id
        LEFT JOIN groupe_logement gl ON tl.id_groupe = gl.id
        WHERE l.id = $1
    """, logement_id)
    if not row:
        raise HTTPException(404, "Logement introuvable")
    return dict(row)

@router.delete("/{logement_id}")
async def supprimer_logement(
    logement_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] not in ["admin", "chef_projet"]:
        raise HTTPException(403, "Permission refusée")
    log = await db.fetchrow(
        "SELECT id FROM logement WHERE id=$1", logement_id
    )
    if not log:
        raise HTTPException(404, "Logement introuvable")
    await db.execute("DELETE FROM logement WHERE id=$1", logement_id)
    return {"status": "ok", "message": "Logement supprimé"}
