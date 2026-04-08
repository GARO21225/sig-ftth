from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_delete

router = APIRouter(prefix="/liens-gc")

class LienGCCreate(BaseModel):
    nom_unique: str
    id_noeud_depart: str
    id_noeud_arrivee: str
    type_lien: str
    nb_fourreaux: Optional[int] = None
    fourreaux_occupes: Optional[int] = 0
    diametre_mm: Optional[int] = None
    materiau: Optional[str] = None
    profondeur_cm: Optional[int] = None
    etat: Optional[str] = "actif"
    date_pose: Optional[str] = None
    commentaire: Optional[str] = None
    coordinates: Optional[List[List[float]]] = None

class LienGCUpdate(BaseModel):
    type_lien: Optional[str] = None
    nb_fourreaux: Optional[int] = None
    fourreaux_occupes: Optional[int] = None
    diametre_mm: Optional[int] = None
    materiau: Optional[str] = None
    profondeur_cm: Optional[int] = None
    etat: Optional[str] = None
    commentaire: Optional[str] = None

@router.get("")
async def liste_liens_gc(
    type_lien: Optional[str] = None,
    etat: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT
            lg.id, lg.nom_unique,
            lg.type_lien, lg.nb_fourreaux,
            lg.fourreaux_occupes,
            lg.diametre_mm, lg.materiau,
            lg.profondeur_cm, lg.longueur_m,
            lg.etat, lg.date_pose,
            lg.commentaire, lg.date_creation,
            nd.nom_unique AS noeud_depart,
            na.nom_unique AS noeud_arrivee,
            ROUND(
                lg.fourreaux_occupes::DECIMAL /
                NULLIF(lg.nb_fourreaux,0)*100,2
            ) AS taux_saturation_pct
        FROM lien_gc lg
        JOIN noeud_gc nd
            ON nd.id = lg.id_noeud_depart
        JOIN noeud_gc na
            ON na.id = lg.id_noeud_arrivee
        WHERE 1=1
    """
    params = []
    i = 1

    if type_lien:
        query += f" AND lg.type_lien = ${i}"
        params.append(type_lien)
        i += 1

    if etat:
        query += f" AND lg.etat = ${i}"
        params.append(etat)

    query += " ORDER BY lg.nom_unique"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/geojson")
async def liens_gc_geojson(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry',
                        ST_AsGeoJSON(lg.geom)::json,
                    'properties', json_build_object(
                        'id', lg.id,
                        'nom_unique', lg.nom_unique,
                        'type_lien', lg.type_lien,
                        'nb_fourreaux', lg.nb_fourreaux,
                        'fourreaux_occupes',
                            lg.fourreaux_occupes,
                        'longueur_m', lg.longueur_m,
                        'etat', lg.etat,
                        'noeud_depart',
                            nd.nom_unique,
                        'noeud_arrivee',
                            na.nom_unique
                    )
                )
            ), '[]'::json)
        ) AS geojson
        FROM lien_gc lg
        JOIN noeud_gc nd
            ON nd.id = lg.id_noeud_depart
        JOIN noeud_gc na
            ON na.id = lg.id_noeud_arrivee
        WHERE lg.geom IS NOT NULL
    """)
    return row['geojson']

@router.get("/{lien_id}")
async def detail_lien_gc(
    lien_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT lg.*, ST_AsGeoJSON(lg.geom)::json AS geom_json,
               n1.nom_unique AS noeud_depart_nom,
               n2.nom_unique AS noeud_arrivee_nom
        FROM lien_gc lg
        LEFT JOIN noeud_gc n1 ON lg.id_noeud_depart = n1.id
        LEFT JOIN noeud_gc n2 ON lg.id_noeud_arrivee = n2.id
        WHERE lg.id = $1
    """, lien_id)
    if not row:
        raise HTTPException(404, "Lien GC introuvable")
    return dict(row)

@router.post("")
async def creer_lien_gc(
    data: LienGCCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin','chef_projet','technicien'
    ]:
        raise HTTPException(403, "Permission refusée")

    existe = await db.fetchrow(
        "SELECT id FROM lien_gc WHERE nom_unique=$1",
        data.nom_unique
    )
    if existe:
        raise HTTPException(
            400,
            f"Un lien GC '{data.nom_unique}' existe déjà"
        )

    if data.id_noeud_depart == data.id_noeud_arrivee:
        raise HTTPException(
            400,
            "Les nœuds de départ et d'arrivée "
            "doivent être différents"
        )

    if (data.fourreaux_occupes and data.nb_fourreaux
            and data.fourreaux_occupes > data.nb_fourreaux):
        raise HTTPException(
            400,
            "fourreaux_occupes > nb_fourreaux"
        )

    if data.coordinates and len(data.coordinates) >= 2:
        geom_sql = f"""
            ST_SetSRID(
                ST_GeomFromText('LINESTRING({
                    ','.join(
                        f'{c[0]} {c[1]}'
                        for c in data.coordinates
                    )
                })'),
                4326
            )
        """
    else:
        geom_sql = """
            ST_MakeLine(
                (SELECT geom FROM noeud_gc WHERE id=$2),
                (SELECT geom FROM noeud_gc WHERE id=$3)
            )
        """

    row = await db.fetchrow(f"""
        INSERT INTO lien_gc
            (nom_unique, id_noeud_depart,
             id_noeud_arrivee, type_lien,
             nb_fourreaux, fourreaux_occupes,
             diametre_mm, materiau,
             profondeur_cm, etat,
             date_pose, commentaire,
             geom, cree_par)
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            {geom_sql}, $13
        )
        RETURNING id, nom_unique,
                  type_lien, longueur_m, etat
    """,
    data.nom_unique,
    data.id_noeud_depart,
    data.id_noeud_arrivee,
    data.type_lien,
    data.nb_fourreaux,
    data.fourreaux_occupes or 0,
    data.diametre_mm,
    data.materiau,
    data.profondeur_cm,
    data.etat,
    data.date_pose,
    data.commentaire,
    current_user['sub'])

    await cache_delete("dashboard:*")
    return dict(row)

@router.put("/{lien_id}")
async def modifier_lien_gc(
    lien_id: str,
    data: LienGCUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin','chef_projet','technicien'
    ]:
        raise HTTPException(403, "Permission refusée")

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
        f"UPDATE lien_gc SET {set_clause} "
        f"WHERE id = $1",
        lien_id, *values
    )

    await cache_delete("dashboard:*")
    return {"message": "Lien GC modifié avec succès"}

@router.delete("/{lien_id}")
async def supprimer_lien_gc(
    lien_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] != 'admin':
        raise HTTPException(
            403, "Seul l'admin peut supprimer"
        )

    await db.execute(
        "DELETE FROM lien_gc WHERE id = $1",
        lien_id
    )

    await cache_delete("dashboard:*")
    return {"message": "Lien GC supprimé"}
