from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_delete

router = APIRouter(prefix="/zones-influence")


class ZoneCreate(BaseModel):
    nom: str
    code: Optional[str] = None
    type_zone: Optional[str] = "standard"
    capacite_max: Optional[int] = None
    commentaire: Optional[str] = None
    geojson_geom: Optional[str] = None  # GeoJSON string


class ZoneUpdate(BaseModel):
    nom: Optional[str] = None
    code: Optional[str] = None
    type_zone: Optional[str] = None
    statut: Optional[str] = None
    capacite_max: Optional[int] = None
    commentaire: Optional[str] = None
    geojson_geom: Optional[str] = None  # Mise à jour géométrie


def _parse_geom(geojson_geom: str) -> dict:
    """Parse et valide un GeoJSON geometry."""
    try:
        if isinstance(geojson_geom, dict):
            geom = geojson_geom
        else:
            geom = json.loads(geojson_geom)
        if geom.get("type") not in ("Polygon", "MultiPolygon"):
            raise ValueError(f"Type géométrie invalide: {geom.get('type')}")
        return geom
    except (json.JSONDecodeError, TypeError) as e:
        raise HTTPException(400, f"GeoJSON invalide: {e}")


@router.get("")
async def liste_zones(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    try:
        rows = await db.fetch("""
            SELECT z.id, z.nom, z.code, z.type_zone, z.statut,
                   z.capacite_max, z.commentaire, z.date_creation,
                   ST_AsGeoJSON(z.geom)::json AS geom,
                   ST_Area(ST_Transform(z.geom, 3857)) / 1000000 AS superficie_km2,
                   (SELECT COUNT(*) FROM logement l WHERE ST_Contains(z.geom, l.geom)) AS nb_logements,
                   (SELECT COUNT(*) FROM noeud_telecom n WHERE ST_Contains(z.geom, n.geom)) AS nb_noeuds
            FROM zone_influence z
            ORDER BY z.nom
        """)
        return [dict(r) for r in rows]
    except Exception as e:
        return []


@router.get("/geojson")
async def zones_geojson(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    try:
        rows = await db.fetch("""
            SELECT z.id::text, z.nom, z.code, z.type_zone, z.statut,
                   z.capacite_max, z.nb_clients_actifs,
                   ST_AsGeoJSON(z.geom)::json AS geometry
            FROM zone_influence z
            WHERE z.geom IS NOT NULL
        """)
        features = []
        for r in rows:
            d = dict(r)
            geom = d.pop("geometry", None)
            if geom:
                features.append({"type": "Feature", "geometry": geom, "properties": d})
        return {"type": "FeatureCollection", "features": features}
    except Exception:
        return {"type": "FeatureCollection", "features": []}


@router.get("/{zone_id}")
async def detail_zone(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT z.*, ST_AsGeoJSON(z.geom)::json AS geom_json,
               ST_Area(ST_Transform(z.geom, 3857)) / 1000000 AS superficie_km2
        FROM zone_influence z WHERE z.id = $1
    """, zone_id)
    if not row:
        raise HTTPException(404, "Zone introuvable")
    return dict(row)


@router.post("")
async def creer_zone(
    data: ZoneCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] not in ("admin", "chef_projet"):
        raise HTTPException(403, "Permission refusée")

    if not data.nom:
        raise HTTPException(400, "Nom requis")

    # Vérifier unicité code
    if data.code:
        existe = await db.fetchrow("SELECT id FROM zone_influence WHERE code = $1", data.code)
        if existe:
            raise HTTPException(400, f"Code '{data.code}' déjà utilisé")

    # Construire le INSERT avec ou sans géométrie
    if data.geojson_geom:
        geom_str = data.geojson_geom if isinstance(data.geojson_geom, str) else json.dumps(data.geojson_geom)
        # Valider
        try:
            g = json.loads(geom_str)
            if g.get("type") not in ("Polygon", "MultiPolygon"):
                raise ValueError("Polygon requis")
        except Exception as e:
            raise HTTPException(400, f"GeoJSON invalide: {e}")

        row = await db.fetchrow("""
            INSERT INTO zone_influence
                (nom, code, type_zone, geom, capacite_max, commentaire, responsable)
            VALUES (
                $1, $2, $3,
                ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
                $5, $6, $7
            )
            RETURNING id, nom, code, type_zone, statut,
                      ST_AsGeoJSON(geom)::json AS geom
        """,
        data.nom, data.code, data.type_zone, geom_str,
        data.capacite_max, data.commentaire, current_user["sub"])
    else:
        row = await db.fetchrow("""
            INSERT INTO zone_influence
                (nom, code, type_zone, capacite_max, commentaire, responsable)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, nom, code, type_zone, statut
        """,
        data.nom, data.code, data.type_zone,
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
    if current_user["role"] not in ("admin", "chef_projet"):
        raise HTTPException(403, "Permission refusée")

    zone = await db.fetchrow("SELECT id FROM zone_influence WHERE id = $1", zone_id)
    if not zone:
        raise HTTPException(404, "Zone introuvable")

    updates = []
    params = [zone_id]
    i = 2

    if data.nom is not None:
        updates.append(f"nom = ${i}"); params.append(data.nom); i += 1
    if data.code is not None:
        updates.append(f"code = ${i}"); params.append(data.code); i += 1
    if data.type_zone is not None:
        updates.append(f"type_zone = ${i}"); params.append(data.type_zone); i += 1
    if data.statut is not None:
        updates.append(f"statut = ${i}"); params.append(data.statut); i += 1
    if data.capacite_max is not None:
        updates.append(f"capacite_max = ${i}"); params.append(data.capacite_max); i += 1
    if data.commentaire is not None:
        updates.append(f"commentaire = ${i}"); params.append(data.commentaire); i += 1
    if data.geojson_geom:
        geom_str = data.geojson_geom if isinstance(data.geojson_geom, str) else json.dumps(data.geojson_geom)
        updates.append(f"geom = ST_SetSRID(ST_GeomFromGeoJSON(${i}), 4326)")
        params.append(geom_str); i += 1

    if not updates:
        raise HTTPException(400, "Aucun champ à modifier")

    await db.execute(
        f"UPDATE zone_influence SET {', '.join(updates)}, date_modification=NOW() WHERE id = $1",
        *params
    )
    await cache_delete("dashboard:*")

    updated = await db.fetchrow("""
        SELECT id, nom, code, type_zone, statut,
               ST_AsGeoJSON(geom)::json AS geom
        FROM zone_influence WHERE id = $1
    """, zone_id)
    return dict(updated)


@router.delete("/{zone_id}")
async def supprimer_zone(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] not in ("admin", "chef_projet"):
        raise HTTPException(403, "Permission refusée")
    await db.execute("DELETE FROM zone_influence WHERE id = $1", zone_id)
    await cache_delete("dashboard:*")
    return {"message": "Zone supprimée"}


@router.get("/{zone_id}/logements")
async def logements_zone(
    zone_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    zone = await db.fetchrow("SELECT geom FROM zone_influence WHERE id = $1", zone_id)
    if not zone: raise HTTPException(404, "Zone introuvable")
    rows = await db.fetch("""
        SELECT l.id, l.nom_unique, l.adresse, l.nb_el_reel,
               ST_X(l.geom) AS longitude, ST_Y(l.geom) AS latitude
        FROM logement l WHERE ST_Contains($1, l.geom)
        ORDER BY l.nom_unique
    """, zone["geom"])
    return {"zone_id": zone_id, "total": len(rows), "logements": [dict(r) for r in rows]}
