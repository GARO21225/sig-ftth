from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.redis import cache_delete

router = APIRouter(prefix="/zones-influence")


class ZoneCreate(BaseModel):
    nom: str
    code: Optional[str] = None
    type_zone: Optional[str] = "standard"
    geojson_geom: str  # GeoJSON string du polygone
    capacite_max: Optional[int] = None
    commentaire: Optional[str] = None


class ZoneUpdate(BaseModel):
    nom: Optional[str] = None
    type_zone: Optional[str] = None
    geojson_geom: Optional[str] = None
    capacite_max: Optional[int] = None
    statut: Optional[str] = None
    commentaire: Optional[str] = None


@router.get("")
async def lister_zones(
    statut: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    where = "WHERE 1=1"
    params = []
    if statut:
        params.append(statut)
        where += f" AND z.statut = ${len(params)}"

    rows = await db.fetch(f"""
        SELECT
            z.id, z.nom, z.code, z.type_zone, z.statut,
            z.capacite_max, z.nb_clients_actifs,
            z.commentaire, z.date_creation,
            ST_AsGeoJSON(z.geom)::json AS geom,
            ST_Area(ST_Transform(z.geom, 3857)) / 1000000 AS superficie_km2,
            (SELECT COUNT(*) FROM logement l
             WHERE ST_Contains(z.geom, l.geom)) AS nb_logements,
            (SELECT COUNT(*) FROM noeud_telecom n
             WHERE ST_Contains(z.geom, n.geom)) AS nb_noeuds
        FROM zone_influence z
        {where}
        ORDER BY z.nom
    """, *params)
    return [dict(r) for r in rows]


@router.get("/geojson")
async def zones_geojson(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT
            id, nom, code, type_zone, statut,
            capacite_max, nb_clients_actifs,
            ST_AsGeoJSON(geom)::json AS geometry
        FROM zone_influence
        WHERE statut = 'active'
    """)
    features = []
    for r in rows:
        features.append({
            "type": "Feature",
            "geometry": r["geometry"],
            "properties": {
                "id": str(r["id"]),
                "nom": r["nom"],
                "code": r["code"],
                "type_zone": r["type_zone"],
                "statut": r["statut"],
                "capacite_max": r["capacite_max"],
                "nb_clients_actifs": r["nb_clients_actifs"],
            }
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/{zone_id}")
async def detail_zone(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT
            z.*,
            ST_AsGeoJSON(z.geom)::json AS geom_json,
            ST_Area(ST_Transform(z.geom, 3857)) / 1000000 AS superficie_km2,
            (SELECT COUNT(*) FROM logement l
             WHERE ST_Contains(z.geom, l.geom)) AS nb_logements,
            (SELECT COUNT(*) FROM noeud_telecom n
             WHERE ST_Contains(z.geom, n.geom)) AS nb_noeuds_telecom,
            (SELECT COUNT(*) FROM noeud_gc n
             WHERE ST_Contains(z.geom, n.geom)) AS nb_noeuds_gc
        FROM zone_influence z
        WHERE z.id = $1
    """, zone_id)
    if not row:
        raise HTTPException(404, "Zone introuvable")
    return dict(row)


@router.get("/{zone_id}/clients")
async def clients_zone(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Logements contenus dans la zone (ST_Contains)."""
    zone = await db.fetchrow(
        "SELECT geom FROM zone_influence WHERE id = $1", zone_id
    )
    if not zone:
        raise HTTPException(404, "Zone introuvable")

    rows = await db.fetch("""
        SELECT
            l.id, l.nom_unique, l.adresse,
            l.nb_el_reel, l.nb_el_raccordables, l.nb_el_raccordes,
            ST_X(l.geom) AS longitude, ST_Y(l.geom) AS latitude
        FROM logement l
        WHERE ST_Contains($1, l.geom)
        ORDER BY l.nom_unique
    """, zone["geom"])
    return {"zone_id": zone_id, "total": len(rows), "logements": [dict(r) for r in rows]}


@router.get("/{zone_id}/reseau")
async def reseau_zone(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Réseau télécom et GC dans la zone."""
    zone = await db.fetchrow(
        "SELECT geom FROM zone_influence WHERE id = $1", zone_id
    )
    if not zone:
        raise HTTPException(404, "Zone introuvable")

    noeuds = await db.fetch("""
        SELECT id, nom_unique, type_noeud, etat,
               ST_X(geom) AS longitude, ST_Y(geom) AS latitude
        FROM noeud_telecom WHERE ST_Contains($1, geom)
    """, zone["geom"])

    liens = await db.fetch("""
        SELECT id, nom_unique, type_lien, longueur_m, etat
        FROM lien_telecom WHERE ST_Contains($1, geom)
    """, zone["geom"])

    return {
        "zone_id": zone_id,
        "noeuds_telecom": [dict(r) for r in noeuds],
        "liens_telecom": [dict(r) for r in liens],
    }


@router.post("")
async def creer_zone(
    data: ZoneCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] not in ["admin", "chef_projet"]:
        raise HTTPException(403, "Permission refusée")

    # Validation géométrie
    valide = await db.fetchval(
        "SELECT ST_IsValid(ST_GeomFromGeoJSON($1))", data.geojson_geom
    )
    if not valide:
        raise HTTPException(400, "Géométrie invalide — vérifiez le polygone")

    if data.code:
        existe = await db.fetchrow(
            "SELECT id FROM zone_influence WHERE code = $1", data.code
        )
        if existe:
            raise HTTPException(400, f"Code zone '{data.code}' déjà utilisé")

    row = await db.fetchrow("""
        INSERT INTO zone_influence
            (nom, code, type_zone, geom, capacite_max, commentaire, responsable)
        VALUES (
            $1, $2, $3,
            ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
            $5, $6, $7
        )
        RETURNING id, nom, code, type_zone, statut
    """,
    data.nom, data.code, data.type_zone, data.geojson_geom,
    data.capacite_max, data.commentaire, current_user["sub"])

    await cache_delete("dashboard:*")
    return dict(row)


@router.put("/{zone_id}")
async def modifier_zone(
    zone_id: str,
    data: ZoneUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] not in ["admin", "chef_projet"]:
        raise HTTPException(403, "Permission refusée")

    zone = await db.fetchrow(
        "SELECT id FROM zone_influence WHERE id = $1", zone_id
    )
    if not zone:
        raise HTTPException(404, "Zone introuvable")

    updates = []
    params = [zone_id]

    if data.nom:
        params.append(data.nom)
        updates.append(f"nom = ${len(params)}")
    if data.type_zone:
        params.append(data.type_zone)
        updates.append(f"type_zone = ${len(params)}")
    if data.statut:
        params.append(data.statut)
        updates.append(f"statut = ${len(params)}")
    if data.capacite_max is not None:
        params.append(data.capacite_max)
        updates.append(f"capacite_max = ${len(params)}")
    if data.commentaire is not None:
        params.append(data.commentaire)
        updates.append(f"commentaire = ${len(params)}")
    if data.geojson_geom:
        valide = await db.fetchval(
            "SELECT ST_IsValid(ST_GeomFromGeoJSON($1))", data.geojson_geom
        )
        if not valide:
            raise HTTPException(400, "Géométrie invalide")
        params.append(data.geojson_geom)
        updates.append(f"geom = ST_SetSRID(ST_GeomFromGeoJSON(${len(params)}), 4326)")

    if not updates:
        raise HTTPException(400, "Aucun champ à modifier")

    updates.append("date_modification = NOW()")
    await db.execute(
        f"UPDATE zone_influence SET {', '.join(updates)} WHERE id = $1",
        *params
    )
    return {"status": "ok", "id": zone_id}


@router.delete("/{zone_id}")
async def supprimer_zone(
    zone_id: str,
    current_user: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    zone = await db.fetchrow(
        "SELECT id FROM zone_influence WHERE id = $1", zone_id
    )
    if not zone:
        raise HTTPException(404, "Zone introuvable")

    await db.execute("DELETE FROM zone_influence WHERE id = $1", zone_id)
    return {"status": "ok", "message": "Zone supprimée"}


@router.post("/{zone_id}/affecter-automatique")
async def affecter_clients_automatique(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Compte et met à jour nb_clients_actifs par ST_Contains."""
    if current_user["role"] not in ["admin", "chef_projet"]:
        raise HTTPException(403, "Permission refusée")

    zone = await db.fetchrow(
        "SELECT id, geom FROM zone_influence WHERE id = $1", zone_id
    )
    if not zone:
        raise HTTPException(404, "Zone introuvable")

    nb = await db.fetchval("""
        SELECT COUNT(*) FROM logement
        WHERE ST_Contains($1, geom)
    """, zone["geom"])

    await db.execute("""
        UPDATE zone_influence
        SET nb_clients_actifs = $1, date_modification = NOW()
        WHERE id = $2
    """, nb, zone_id)

    return {"zone_id": zone_id, "nb_clients_affectes": nb}
