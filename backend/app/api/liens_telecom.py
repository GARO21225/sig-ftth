from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_delete

router = APIRouter(prefix="/liens-telecom")

class LienTelecomCreate(BaseModel):
    nom_unique: str
    id_noeud_depart: str
    id_noeud_arrivee: str
    type_lien: str
    type_cable: Optional[str] = None
    nb_fibres: Optional[int] = None
    fibres_utilisees: Optional[int] = 0
    etat: Optional[str] = "actif"
    date_pose: Optional[str] = None
    commentaire: Optional[str] = None
    coordinates: Optional[List[List[float]]] = None

class LienTelecomUpdate(BaseModel):
    type_lien: Optional[str] = None
    type_cable: Optional[str] = None
    nb_fibres: Optional[int] = None
    fibres_utilisees: Optional[int] = None
    etat: Optional[str] = None
    commentaire: Optional[str] = None

@router.get("")
async def liste_liens_telecom(
    type_lien: Optional[str] = None,
    etat: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT
            lt.id, lt.nom_unique,
            lt.type_lien, lt.type_cable,
            lt.nb_fibres, lt.fibres_utilisees,
            lt.longueur_m, lt.etat,
            lt.date_pose, lt.commentaire,
            lt.date_creation,
            nd.nom_unique AS noeud_depart,
            na.nom_unique AS noeud_arrivee,
            ROUND(
                lt.fibres_utilisees::DECIMAL /
                NULLIF(lt.nb_fibres,0)*100,2
            ) AS taux_saturation_pct
        FROM lien_telecom lt
        JOIN noeud_telecom nd
            ON nd.id = lt.id_noeud_depart
        JOIN noeud_telecom na
            ON na.id = lt.id_noeud_arrivee
        WHERE 1=1
    """
    params = []
    i = 1

    if type_lien:
        query += f" AND lt.type_lien = ${i}"
        params.append(type_lien)
        i += 1

    if etat:
        query += f" AND lt.etat = ${i}"
        params.append(etat)

    query += " ORDER BY lt.nom_unique"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/geojson")
async def liens_telecom_geojson(
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
                        ST_AsGeoJSON(lt.geom)::json,
                    'properties', json_build_object(
                        'id', lt.id,
                        'nom_unique', lt.nom_unique,
                        'type_lien', lt.type_lien,
                        'type_cable', lt.type_cable,
                        'nb_fibres', lt.nb_fibres,
                        'fibres_utilisees',
                            lt.fibres_utilisees,
                        'longueur_m', lt.longueur_m,
                        'etat', lt.etat,
                        'noeud_depart',
                            nd.nom_unique,
                        'noeud_arrivee',
                            na.nom_unique
                    )
                )
            ), '[]'::json)
        ) AS geojson
        FROM lien_telecom lt
        JOIN noeud_telecom nd
            ON nd.id = lt.id_noeud_depart
        JOIN noeud_telecom na
            ON na.id = lt.id_noeud_arrivee
        WHERE lt.geom IS NOT NULL
    """)
    return row['geojson']

@router.get("/{lien_id}")
async def detail_lien_telecom(
    lien_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT lt.*, ST_AsGeoJSON(lt.geom)::json AS geom_json,
               n1.nom_unique AS noeud_depart_nom,
               n2.nom_unique AS noeud_arrivee_nom
        FROM lien_telecom lt
        LEFT JOIN noeud_telecom n1 ON lt.id_noeud_depart = n1.id
        LEFT JOIN noeud_telecom n2 ON lt.id_noeud_arrivee = n2.id
        WHERE lt.id = $1
    """, lien_id)
    if not row:
        raise HTTPException(404, "Lien introuvable")
    return dict(row)

@router.post("")
async def creer_lien_telecom(
    data: LienTelecomCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin','chef_projet','technicien'
    ]:
        raise HTTPException(403, "Permission refusée")

    # Vérifier unicité
    existe = await db.fetchrow(
        "SELECT id FROM lien_telecom WHERE nom_unique=$1",
        data.nom_unique
    )
    if existe:
        raise HTTPException(400, f"Un lien '{data.nom_unique}' existe déjà")

    # Validation attributaire — cohérence fibres PCR v2.5
    if data.nb_fibres and data.fibres_utilisees:
        if data.fibres_utilisees > data.nb_fibres:
            raise HTTPException(400,
                f"fibres_utilisees ({data.fibres_utilisees}) "
                f"ne peut pas dépasser nb_fibres ({data.nb_fibres})"
            )

    # Vérifier que les noeuds existent
    n_dep = await db.fetchrow("SELECT id FROM noeud_telecom WHERE id=$1", data.id_noeud_depart)
    n_arr = await db.fetchrow("SELECT id FROM noeud_telecom WHERE id=$1", data.id_noeud_arrivee)
    if not n_dep:
        raise HTTPException(400, f"Noeud départ '{data.id_noeud_depart}' introuvable")
    if not n_arr:
        raise HTTPException(400, f"Noeud arrivée '{data.id_noeud_arrivee}' introuvable")

    # Vérifier noeuds différents
    if data.id_noeud_depart == data.id_noeud_arrivee:
        raise HTTPException(
            400,
            "Les nœuds de départ et d'arrivée "
            "doivent être différents"
        )

    # Vérifier noeuds existent
    for noeud_id in [
        data.id_noeud_depart,
        data.id_noeud_arrivee
    ]:
        n = await db.fetchrow(
            "SELECT id FROM noeud_telecom WHERE id=$1",
            noeud_id
        )
        if not n:
            raise HTTPException(
                404,
                f"Nœud {noeud_id} non trouvé"
            )

    # Vérifier fibres
    if (data.fibres_utilisees and data.nb_fibres
            and data.fibres_utilisees > data.nb_fibres):
        raise HTTPException(
            400,
            "fibres_utilisees > nb_fibres"
        )

    # Construire géométrie depuis noeuds si pas de coords
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
                (SELECT geom FROM noeud_telecom
                 WHERE id = $2),
                (SELECT geom FROM noeud_telecom
                 WHERE id = $3)
            )
        """

    row = await db.fetchrow(f"""
        INSERT INTO lien_telecom
            (nom_unique, id_noeud_depart,
             id_noeud_arrivee, type_lien,
             type_cable, nb_fibres,
             fibres_utilisees, etat,
             date_pose, commentaire,
             geom, cree_par)
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            {geom_sql},
            $11
        )
        RETURNING id, nom_unique,
                  type_lien, longueur_m, etat
    """,
    data.nom_unique,
    data.id_noeud_depart,
    data.id_noeud_arrivee,
    data.type_lien,
    data.type_cable,
    data.nb_fibres,
    data.fibres_utilisees or 0,
    data.etat,
    data.date_pose,
    data.commentaire,
    current_user['sub'])

    await cache_delete("dashboard:*")
    return dict(row)

@router.put("/{lien_id}")
async def modifier_lien_telecom(
    lien_id: str,
    data: LienTelecomUpdate,
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
        f"UPDATE lien_telecom SET {set_clause} "
        f"WHERE id = $1",
        lien_id, *values
    )

    await cache_delete("dashboard:*")
    return {"message": "Lien modifié avec succès"}

@router.delete("/{lien_id}")
async def supprimer_lien_telecom(
    lien_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] != 'admin':
        raise HTTPException(
            403, "Seul l'admin peut supprimer"
        )

    await db.execute(
        "DELETE FROM lien_telecom WHERE id = $1",
        lien_id
    )

    await cache_delete("dashboard:*")
    return {"message": "Lien supprimé"}
