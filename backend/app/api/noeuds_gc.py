from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_delete

router = APIRouter(prefix="/noeuds-telecom")

class NoeudTelecomCreate(BaseModel):
    nom_unique: str
    type_noeud: str
    longitude: float
    latitude: float
    capacite_fibres_max: Optional[int] = None
    nb_ports: Optional[int] = None
    marque: Optional[str] = None
    modele: Optional[str] = None
    etat: Optional[str] = "actif"
    date_pose: Optional[str] = None
    commentaire: Optional[str] = None

class NoeudTelecomUpdate(BaseModel):
    type_noeud: Optional[str] = None
    capacite_fibres_max: Optional[int] = None
    nb_ports: Optional[int] = None
    marque: Optional[str] = None
    modele: Optional[str] = None
    etat: Optional[str] = None
    commentaire: Optional[str] = None

@router.get("")
async def liste_noeuds(
    type_noeud: Optional[str] = None,
    etat: Optional[str] = None,
    bbox: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT
            id, nom_unique, type_noeud,
            ST_X(geom) AS longitude,
            ST_Y(geom) AS latitude,
            capacite_fibres_max,
            fibres_utilisees,
            nb_ports, ports_utilises,
            marque, modele, etat,
            date_pose, commentaire,
            date_creation,
            ROUND(
                fibres_utilisees::DECIMAL /
                NULLIF(capacite_fibres_max,0)*100,2
            ) AS taux_saturation_pct
        FROM noeud_telecom
        WHERE 1=1
    """
    params = []
    i = 1

    if type_noeud:
        query += f" AND type_noeud = ${i}"
        params.append(type_noeud)
        i += 1

    if etat:
        query += f" AND etat = ${i}"
        params.append(etat)
        i += 1

    if bbox:
        coords = [float(x) for x in bbox.split(',')]
        query += f"""
            AND ST_Within(geom,
                ST_MakeEnvelope(${i},${i+1},${i+2},${i+3},4326)
            )
        """
        params.extend(coords)
        i += 4

    query += " ORDER BY nom_unique"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/geojson")
async def noeuds_geojson(
    type_noeud: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom_unique', nom_unique,
                        'type_noeud', type_noeud,
                        'etat', etat,
                        'capacite_fibres_max',
                            capacite_fibres_max,
                        'fibres_utilisees',
                            fibres_utilisees,
                        'taux_saturation',
                            ROUND(fibres_utilisees::DECIMAL /
                            NULLIF(capacite_fibres_max,0)*100,2)
                    )
                )
            ), '[]'::json)
        ) AS geojson
        FROM noeud_telecom
        WHERE 1=1
    """
    params = []
    if type_noeud:
        query += " AND type_noeud = $1"
        params.append(type_noeud)

    row = await db.fetchrow(query, *params)
    return row['geojson']

@router.get("/{noeud_id}")
async def get_noeud(
    noeud_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT
            id, nom_unique, type_noeud,
            ST_X(geom) AS longitude,
            ST_Y(geom) AS latitude,
            capacite_fibres_max, fibres_utilisees,
            nb_ports, ports_utilises,
            marque, modele, etat,
            date_pose, commentaire, date_creation
        FROM noeud_telecom WHERE id = $1
    """, noeud_id)

    if not row:
        raise HTTPException(404, "Nœud non trouvé")
    return dict(row)

@router.post("")
async def creer_noeud(
    data: NoeudTelecomCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin','chef_projet','technicien'
    ]:
        raise HTTPException(403, "Permission refusée")

    # Vérifier unicité
    existe = await db.fetchrow(
        "SELECT id FROM noeud_telecom WHERE nom_unique=$1",
        data.nom_unique
    )
    if existe:
        raise HTTPException(
            400,
            f"Un nœud '{data.nom_unique}' existe déjà"
        )

    row = await db.fetchrow("""
        INSERT INTO noeud_telecom
            (nom_unique, type_noeud, geom,
             capacite_fibres_max, nb_ports,
             marque, modele, etat,
             date_pose, commentaire, cree_par)
        VALUES (
            $1, $2,
            ST_SetSRID(ST_MakePoint($3,$4),4326),
            $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING id, nom_unique, type_noeud, etat
    """,
    data.nom_unique, data.type_noeud,
    data.longitude, data.latitude,
    data.capacite_fibres_max, data.nb_ports,
    data.marque, data.modele, data.etat,
    data.date_pose, data.commentaire,
    current_user['sub'])

    await cache_delete("dashboard:*")
    return dict(row)

@router.put("/{noeud_id}")
async def modifier_noeud(
    noeud_id: str,
    data: NoeudTelecomUpdate,
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
        f"UPDATE noeud_telecom SET {set_clause} "
        f"WHERE id = $1",
        noeud_id, *values
    )

    await cache_delete("dashboard:*")
    return {"message": "Nœud modifié avec succès"}

@router.delete("/{noeud_id}")
async def supprimer_noeud(
    noeud_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] != 'admin':
        raise HTTPException(
            403,
            "Seul l'admin peut supprimer"
        )

    # Vérifier liens associés
    liens = await db.fetchrow("""
        SELECT COUNT(*) AS nb FROM lien_telecom
        WHERE id_noeud_depart = $1
        OR id_noeud_arrivee = $1
    """, noeud_id)

    if liens['nb'] > 0:
        raise HTTPException(
            400,
            f"Impossible : {liens['nb']} lien(s) "
            f"connecté(s) à ce nœud"
        )

    await db.execute(
        "DELETE FROM noeud_telecom WHERE id = $1",
        noeud_id
    )

    await cache_delete("dashboard:*")
    return {"message": "Nœud supprimé"}
