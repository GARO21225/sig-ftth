from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import httpx
import json
import math

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/itineraires")

OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
OSRM_WALK = "https://router.project-osrm.org/route/v1/foot"


class ItineraireRequest(BaseModel):
    lat_depart: float
    lng_depart: float
    lat_arrivee: float
    lng_arrivee: float
    type_itineraire: Optional[str] = "technicien_client"
    mode: Optional[str] = "driving"  # driving | walking | direct
    nom: Optional[str] = None
    # Optionnel: IDs nœuds au lieu de coords
    id_noeud_depart: Optional[str] = None
    id_noeud_arrivee: Optional[str] = None


def haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))


async def get_osrm_route(lng1, lat1, lng2, lat2, mode="driving") -> dict:
    """Appel OSRM pour route routière réelle."""
    base = OSRM_WALK if mode == "walking" else OSRM_URL
    url = f"{base}/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson&steps=true"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                if data.get("routes"):
                    route = data["routes"][0]
                    return {
                        "geometry": route["geometry"],
                        "distance_m": round(route["distance"]),
                        "duration_s": round(route["duration"]),
                        "steps": [
                            {
                                "instruction": s.get("maneuver", {}).get("type", ""),
                                "distance_m": round(s.get("distance", 0)),
                                "name": s.get("name", "")
                            }
                            for leg in route.get("legs", [])
                            for s in leg.get("steps", [])
                            if s.get("distance", 0) > 10
                        ][:10]
                    }
    except Exception as e:
        pass
    return None


@router.post("/calculer")
async def calculer_itineraire(
    data: ItineraireRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Calcule itinéraire style Google Maps entre deux points."""
    lat_dep, lng_dep = data.lat_depart, data.lng_depart
    lat_arr, lng_arr = data.lat_arrivee, data.lng_arrivee

    # Si IDs nœuds fournis, récupérer les coordonnées
    if data.id_noeud_depart:
        nd = await db.fetchrow(
            "SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng, nom_unique, type_noeud FROM noeud_telecom WHERE id=$1",
            data.id_noeud_depart
        )
        if not nd:
            nd = await db.fetchrow(
                "SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng, nom_unique, type_noeud FROM noeud_gc WHERE id=$1",
                data.id_noeud_depart
            )
        if nd:
            lat_dep, lng_dep = nd["lat"], nd["lng"]

    if data.id_noeud_arrivee:
        na = await db.fetchrow(
            "SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng, nom_unique, type_noeud FROM noeud_telecom WHERE id=$1",
            data.id_noeud_arrivee
        )
        if not na:
            na = await db.fetchrow(
                "SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng, nom_unique, type_noeud FROM noeud_gc WHERE id=$1",
                data.id_noeud_arrivee
            )
        if na:
            lat_arr, lng_arr = na["lat"], na["lng"]

    # Trouver nœuds les plus proches
    noeud_dep = await db.fetchrow("""
        SELECT id, nom_unique, type_noeud,
               ST_X(geom) AS lng, ST_Y(geom) AS lat,
               ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS dist
        FROM noeud_telecom WHERE geom IS NOT NULL
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326) LIMIT 1
    """, lng_dep, lat_dep)

    noeud_arr = await db.fetchrow("""
        SELECT id, nom_unique, type_noeud,
               ST_X(geom) AS lng, ST_Y(geom) AS lat,
               ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS dist
        FROM noeud_telecom WHERE geom IS NOT NULL
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326) LIMIT 1
    """, lng_arr, lat_arr)

    # Distance directe
    distance_directe = haversine(lat_dep, lng_dep, lat_arr, lng_arr)

    # Route OSRM (route réelle)
    route_data = None
    if data.mode != "direct":
        route_data = await get_osrm_route(lng_dep, lat_dep, lng_arr, lat_arr, data.mode or "driving")

    # GeoJSON features
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng_dep, lat_dep]},
            "properties": {"type": "depart", "label": "📍 Départ", "couleur": "#22C55E"}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng_arr, lat_arr]},
            "properties": {"type": "arrivee", "label": "🏁 Arrivée", "couleur": "#EF4444"}
        },
    ]

    # Ajouter nœuds proches
    if noeud_dep:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [noeud_dep["lng"], noeud_dep["lat"]]},
            "properties": {"type": "noeud_proche", "nom": noeud_dep["nom_unique"],
                           "type_noeud": noeud_dep["type_noeud"],
                           "dist": round(noeud_dep["dist"]), "role": "depart"}
        })
    if noeud_arr:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [noeud_arr["lng"], noeud_arr["lat"]]},
            "properties": {"type": "noeud_proche", "nom": noeud_arr["nom_unique"],
                           "type_noeud": noeud_arr["type_noeud"],
                           "dist": round(noeud_arr["dist"]), "role": "arrivee"}
        })

    # Route tracée
    route_geom = None
    distance_route = distance_directe
    duration_s = None
    steps = []

    if route_data:
        route_geom = route_data["geometry"]
        distance_route = route_data["distance_m"]
        duration_s = route_data["duration_s"]
        steps = route_data.get("steps", [])
        features.append({
            "type": "Feature",
            "geometry": route_geom,
            "properties": {"type": "route", "distance_m": distance_route,
                           "mode": data.mode, "couleur": "#3B82F6"}
        })
    else:
        # Ligne droite si OSRM indisponible
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[lng_dep, lat_dep], [lng_arr, lat_arr]]},
            "properties": {"type": "route_directe", "distance_m": distance_directe, "couleur": "#F59E0B"}
        })

    # Liens réseau sur le trajet
    liens = await db.fetch("""
        SELECT lt.nom_unique, lt.longueur_m,
               COALESCE(ST_AsGeoJSON(lt.geom), ST_AsGeoJSON(ST_MakeLine(nd.geom, na.geom)))::json AS geometry
        FROM lien_telecom lt
        JOIN noeud_telecom nd ON nd.id = lt.id_noeud_depart
        JOIN noeud_telecom na ON na.id = lt.id_noeud_arrivee
        WHERE lt.id_noeud_depart IN ($1,$2)
           OR lt.id_noeud_arrivee IN ($1,$2)
        LIMIT 15
    """, str(noeud_dep["id"]) if noeud_dep else "00000000-0000-0000-0000-000000000000",
         str(noeud_arr["id"]) if noeud_arr else "00000000-0000-0000-0000-000000000000")

    for l in liens:
        if l["geometry"]:
            features.append({
                "type": "Feature",
                "geometry": l["geometry"],
                "properties": {"type": "fibre", "nom": l["nom_unique"],
                               "longueur_m": l["longueur_m"], "couleur": "#8B5CF6"}
            })

    # Sauvegarder
    nom_iti = data.nom or f"ITI-{data.type_itineraire}-{distance_directe}m"
    coords_wkt = []
    if route_geom and route_geom.get("coordinates"):
        coords_str = ", ".join(f"{c[0]} {c[1]}" for c in route_geom["coordinates"][:50])
        trace_wkt = f"LINESTRING({coords_str})"
    else:
        trace_wkt = f"LINESTRING({lng_dep} {lat_dep}, {lng_arr} {lat_arr})"

    try:
        iti_id = await db.fetchval("""
            INSERT INTO itineraire (nom, type_itineraire, id_noeud_depart, id_noeud_arrivee,
                geom_depart, geom_arrivee, geom_trace, distance_m, cree_par)
            VALUES ($1,$2,$3,$4,
                ST_SetSRID(ST_MakePoint($5,$6),4326),
                ST_SetSRID(ST_MakePoint($7,$8),4326),
                ST_SetSRID(ST_GeomFromText($9),4326),
                $10,$11) RETURNING id
        """, nom_iti, data.type_itineraire,
            str(noeud_dep["id"]) if noeud_dep else None,
            str(noeud_arr["id"]) if noeud_arr else None,
            lng_dep, lat_dep, lng_arr, lat_arr,
            trace_wkt, distance_route, current_user["sub"])
    except Exception:
        iti_id = None

    return {
        "itineraire_id": str(iti_id) if iti_id else None,
        "type": data.type_itineraire,
        "mode": data.mode,
        "distance_directe_m": distance_directe,
        "distance_route_m": distance_route,
        "duree_estimee_s": duration_s,
        "duree_min": round(duration_s / 60) if duration_s else None,
        "noeud_depart": {
            "id": str(noeud_dep["id"]) if noeud_dep else None,
            "nom": noeud_dep["nom_unique"] if noeud_dep else "?",
            "type": noeud_dep["type_noeud"] if noeud_dep else None,
            "distance_m": round(noeud_dep["dist"]) if noeud_dep else None
        },
        "noeud_arrivee": {
            "id": str(noeud_arr["id"]) if noeud_arr else None,
            "nom": noeud_arr["nom_unique"] if noeud_arr else "?",
            "type": noeud_arr["type_noeud"] if noeud_arr else None,
            "distance_m": round(noeud_arr["dist"]) if noeud_arr else None
        },
        "instructions": steps,
        "geojson": {"type": "FeatureCollection", "features": features}
    }


@router.get("")
async def lister_itineraires(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT i.id, i.nom, i.type_itineraire, i.distance_m,
               i.date_creation,
               nd.nom_unique AS noeud_depart_nom,
               na.nom_unique AS noeud_arrivee_nom
        FROM itineraire i
        LEFT JOIN noeud_telecom nd ON nd.id = i.id_noeud_depart
        LEFT JOIN noeud_telecom na ON na.id = i.id_noeud_arrivee
        WHERE i.cree_par = $1
        ORDER BY i.date_creation DESC LIMIT 50
    """, current_user["sub"])
    return [dict(r) for r in rows]


@router.get("/{iti_id}")
async def detail_itineraire(
    iti_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow(
        "SELECT *, ST_AsGeoJSON(geom_trace)::json AS trace FROM itineraire WHERE id=$1",
        iti_id
    )
    if not row:
        raise HTTPException(404, "Itinéraire introuvable")
    return dict(row)


@router.delete("/{iti_id}")
async def supprimer_itineraire(
    iti_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    await db.execute("DELETE FROM itineraire WHERE id=$1 AND cree_par=$2",
                     iti_id, current_user["sub"])
    return {"message": "Supprimé"}
