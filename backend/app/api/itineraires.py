from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/itineraires")


class ItineraireRequest(BaseModel):
    lat_depart: float
    lng_depart: float
    lat_arrivee: float
    lng_arrivee: float
    type_itineraire: Optional[str] = "technicien_client"
    nom: Optional[str] = None


class ItineraireNoeudRequest(BaseModel):
    id_noeud_depart: str
    id_noeud_arrivee: str
    type_itineraire: Optional[str] = "technicien_pbo"
    nom: Optional[str] = None


@router.post("/calculer")
async def calculer_itineraire(
    data: ItineraireRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Calcule itinéraire entre deux points GPS via le réseau de noeuds."""
    noeud_dep = await db.fetchrow("""
        SELECT id, nom_unique, type_noeud,
               ST_X(geom) AS lng, ST_Y(geom) AS lat,
               ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance_m
        FROM noeud_telecom
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326)
        LIMIT 1
    """, data.lng_depart, data.lat_depart)

    noeud_arr = await db.fetchrow("""
        SELECT id, nom_unique, type_noeud,
               ST_X(geom) AS lng, ST_Y(geom) AS lat,
               ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance_m
        FROM noeud_telecom
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326)
        LIMIT 1
    """, data.lng_arrivee, data.lat_arrivee)

    if not noeud_dep or not noeud_arr:
        raise HTTPException(404, "Aucun noeud réseau trouvé dans le secteur")

    distance_directe = await db.fetchval("""
        SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
            ST_SetSRID(ST_MakePoint($3,$4),4326)::geography
        )
    """, data.lng_depart, data.lat_depart, data.lng_arrivee, data.lat_arrivee)

    liens_chemin = await db.fetch("""
        SELECT lt.id, lt.nom_unique, lt.longueur_m,
               ST_AsGeoJSON(lt.geom)::json AS geometry
        FROM lien_telecom lt
        WHERE lt.id_noeud_depart = $1 OR lt.id_noeud_arrivee = $1
           OR lt.id_noeud_depart = $2 OR lt.id_noeud_arrivee = $2
        ORDER BY lt.longueur_m LIMIT 20
    """, str(noeud_dep["id"]), str(noeud_arr["id"]))

    features = [
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": [data.lng_depart, data.lat_depart]},
         "properties": {"type": "depart", "label": "Point de départ"}},
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": [data.lng_arrivee, data.lat_arrivee]},
         "properties": {"type": "arrivee", "label": "Point d'arrivée"}},
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": [noeud_dep["lng"], noeud_dep["lat"]]},
         "properties": {"type": "noeud_depart", "nom": noeud_dep["nom_unique"],
                        "distance_m": round(noeud_dep["distance_m"])}},
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": [noeud_arr["lng"], noeud_arr["lat"]]},
         "properties": {"type": "noeud_arrivee", "nom": noeud_arr["nom_unique"],
                        "distance_m": round(noeud_arr["distance_m"])}},
    ]
    distance_reseau = 0
    for l in liens_chemin:
        distance_reseau += l["longueur_m"] or 0
        features.append({"type": "Feature", "geometry": l["geometry"],
                         "properties": {"type": "lien", "nom": l["nom_unique"], "longueur_m": l["longueur_m"]}})

    nom_iti = data.nom or f"ITI-{data.type_itineraire}"
    trace_wkt = f"LINESTRING({data.lng_depart} {data.lat_depart}, {data.lng_arrivee} {data.lat_arrivee})"
    iti_id = await db.fetchval("""
        INSERT INTO itineraire (nom, type_itineraire, id_noeud_depart, id_noeud_arrivee,
            geom_depart, geom_arrivee, geom_trace, distance_m, cree_par)
        VALUES ($1,$2,$3,$4,
            ST_SetSRID(ST_MakePoint($5,$6),4326),
            ST_SetSRID(ST_MakePoint($7,$8),4326),
            ST_SetSRID(ST_GeomFromText($9),4326),
            $10,$11) RETURNING id
    """, nom_iti, data.type_itineraire,
        str(noeud_dep["id"]), str(noeud_arr["id"]),
        data.lng_depart, data.lat_depart,
        data.lng_arrivee, data.lat_arrivee,
        trace_wkt, round(distance_directe), current_user["sub"])

    return {
        "itineraire_id": str(iti_id),
        "type": data.type_itineraire,
        "distance_directe_m": round(distance_directe),
        "distance_reseau_m": round(distance_reseau),
        "noeud_depart": {"id": str(noeud_dep["id"]), "nom": noeud_dep["nom_unique"],
                         "distance_m": round(noeud_dep["distance_m"])},
        "noeud_arrivee": {"id": str(noeud_arr["id"]), "nom": noeud_arr["nom_unique"],
                          "distance_m": round(noeud_arr["distance_m"])},
        "geojson": {"type": "FeatureCollection", "features": features}
    }


@router.get("")
async def lister_itineraires(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT i.id, i.nom, i.type_itineraire, i.distance_m,
               i.statut, i.date_creation,
               n1.nom_unique AS noeud_depart_nom,
               n2.nom_unique AS noeud_arrivee_nom
        FROM itineraire i
        LEFT JOIN noeud_telecom n1 ON i.id_noeud_depart = n1.id
        LEFT JOIN noeud_telecom n2 ON i.id_noeud_arrivee = n2.id
        ORDER BY i.date_creation DESC LIMIT 100
    """)
    return [dict(r) for r in rows]


@router.get("/{iti_id}")
async def detail_itineraire(
    iti_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        SELECT i.*, ST_AsGeoJSON(i.geom_trace)::json AS trace_geojson,
               n1.nom_unique AS noeud_depart_nom,
               n2.nom_unique AS noeud_arrivee_nom
        FROM itineraire i
        LEFT JOIN noeud_telecom n1 ON i.id_noeud_depart = n1.id
        LEFT JOIN noeud_telecom n2 ON i.id_noeud_arrivee = n2.id
        WHERE i.id = $1
    """, iti_id)
    if not row:
        raise HTTPException(404, "Itinéraire introuvable")
    return dict(row)


@router.delete("/{iti_id}")
async def supprimer_itineraire(
    iti_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] not in ["admin", "chef_projet", "technicien"]:
        raise HTTPException(403, "Permission refusée")
    iti = await db.fetchrow("SELECT id FROM itineraire WHERE id=$1", iti_id)
    if not iti:
        raise HTTPException(404, "Itinéraire introuvable")
    await db.execute("DELETE FROM itineraire WHERE id=$1", iti_id)
    return {"status": "ok"}
