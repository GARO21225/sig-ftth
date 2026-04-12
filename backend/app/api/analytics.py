"""
Module Analytics — Prédictions, heatmap EL, alertes intelligentes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import json
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/analytics")


@router.get("/heatmap-el")
async def heatmap_el(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Données heatmap : [lat, lng, intensité] pour Leaflet.heat"""
    rows = await db.fetch("""
        SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng,
               COALESCE(nb_el_raccordables, nb_el_reel, 1) AS intensite
        FROM logement
        WHERE geom IS NOT NULL
    """)
    points = [[round(float(r["lat"]),6), round(float(r["lng"]),6), int(r["intensite"])] for r in rows]
    return {"type": "heatmap", "total_points": len(points), "data": points}


@router.get("/saturation-noeuds")
async def saturation_noeuds(
    seuil: Optional[int] = 70,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Nœuds dont la saturation dépasse le seuil (%)"""
    rows = await db.fetch("""
        SELECT id, nom_unique, type_noeud,
               capacite_fibres_max,
               COALESCE(nb_fibres_utilisees, 0) AS nb_fibres_utilisees,
               CASE WHEN capacite_fibres_max > 0
                    THEN ROUND(COALESCE(nb_fibres_utilisees,0)::numeric / capacite_fibres_max * 100, 1)
                    ELSE 0 END AS saturation_pct,
               ST_X(geom) AS longitude, ST_Y(geom) AS latitude, etat
        FROM noeud_telecom
        WHERE capacite_fibres_max > 0
        HAVING CASE WHEN capacite_fibres_max > 0
                    THEN ROUND(COALESCE(nb_fibres_utilisees,0)::numeric / capacite_fibres_max * 100, 1)
                    ELSE 0 END >= $1
        ORDER BY saturation_pct DESC
    """, seuil)
    # Fallback sans HAVING (postgres pas tjrs compatible)
    if not rows:
        rows = await db.fetch("""
            SELECT id, nom_unique, type_noeud,
                   capacite_fibres_max,
                   COALESCE(nb_fibres_utilisees, 0) AS nb_fibres_utilisees,
                   CASE WHEN capacite_fibres_max > 0
                        THEN ROUND(COALESCE(nb_fibres_utilisees,0)::numeric / capacite_fibres_max * 100, 1)
                        ELSE 0 END AS saturation_pct,
                   ST_X(geom) AS longitude, ST_Y(geom) AS latitude, etat
            FROM noeud_telecom
            WHERE capacite_fibres_max > 0
            ORDER BY saturation_pct DESC
            LIMIT 50
        """)
        rows = [r for r in rows if r['saturation_pct'] >= seuil]
    return {"seuil_pct": seuil, "nb_noeuds_critiques": len(rows), "noeuds": [dict(r) for r in rows]}


@router.get("/prediction-saturation/{noeud_id}")
async def prediction_saturation(
    noeud_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Prédiction ML linéaire : dans combien de jours le nœud sera saturé"""
    noeud = await db.fetchrow("""
        SELECT id, nom_unique, capacite_fibres_max,
               COALESCE(nb_fibres_utilisees, 0) AS nb_fibres_utilisees
        FROM noeud_telecom WHERE id = $1
    """, noeud_id)
    if not noeud:
        raise HTTPException(404, "Nœud introuvable")

    # Historique des modifications sur ce nœud
    historique = await db.fetch("""
        SELECT date_action,
               (donnees_apres->>'nb_fibres_utilisees')::float AS val
        FROM historique_modifications
        WHERE table_cible = 'noeud_telecom'
          AND id_objet = $1
          AND donnees_apres->>'nb_fibres_utilisees' IS NOT NULL
        ORDER BY date_action
        LIMIT 50
    """, noeud_id)

    cap = noeud['capacite_fibres_max'] or 1
    current_use = noeud['nb_fibres_utilisees'] or 0
    saturation_pct = round(current_use / cap * 100, 1)

    # Régression linéaire simple si données suffisantes
    prediction = None
    if len(historique) >= 3:
        from datetime import datetime
        vals = [(i, float(r['val'])) for i, r in enumerate(historique)]
        n = len(vals)
        sum_x = sum(v[0] for v in vals)
        sum_y = sum(v[1] for v in vals)
        sum_xy = sum(v[0]*v[1] for v in vals)
        sum_xx = sum(v[0]**2 for v in vals)
        denom = n*sum_xx - sum_x**2
        if denom != 0:
            slope = (n*sum_xy - sum_x*sum_y) / denom
            intercept = (sum_y - slope*sum_x) / n
            if slope > 0:
                steps_to_full = (cap - intercept) / slope
                # Durée moy entre historique
                dates = [r['date_action'] for r in historique]
                if len(dates) >= 2:
                    total_days = (dates[-1] - dates[0]).days
                    days_per_step = total_days / (len(dates)-1) if len(dates) > 1 else 30
                    days_to_saturation = int(steps_to_full * days_per_step)
                    prediction = {
                        "jours_avant_saturation": max(0, days_to_saturation),
                        "slope_par_periode": round(slope, 2),
                        "niveau_confiance": "élevé" if n >= 10 else "moyen" if n >= 5 else "faible",
                        "nb_points_historique": n
                    }

    return {
        "noeud_id": noeud_id,
        "nom": noeud['nom_unique'],
        "capacite_max": cap,
        "fibres_utilisees": current_use,
        "saturation_pct": saturation_pct,
        "statut": "critique" if saturation_pct >= 90 else "alerte" if saturation_pct >= 75 else "normal",
        "prediction": prediction,
        "message": "Données historiques insuffisantes — activer les triggers historisation" if not prediction else None
    }


@router.get("/rapport-pdf-data")
async def donnees_rapport_pdf(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Agrège toutes les données pour le rapport PDF"""
    try:
        kpi = await db.fetchrow("SELECT * FROM kpi_dashboard")
        kpi_data = dict(kpi) if kpi else {}
    except Exception:
        kpi_data = {}

    noeuds_critiques = await db.fetch("""
        SELECT nom_unique, type_noeud,
               CASE WHEN capacite_fibres_max > 0
                    THEN ROUND(COALESCE(nb_fibres_utilisees,0)::numeric / capacite_fibres_max * 100)
                    ELSE 0 END AS saturation_pct
        FROM noeud_telecom
        WHERE capacite_fibres_max > 0
        ORDER BY saturation_pct DESC LIMIT 5
    """)

    ot_actifs = await db.fetch("""
        SELECT numero_ot, titre, statut, priorite, date_fin_prevue
        FROM ordre_travail
        WHERE statut NOT IN ('termine','cloture','annule')
        ORDER BY priorite DESC, date_fin_prevue
        LIMIT 10
    """)

    return {
        "date_rapport": "aujourd'hui",
        "kpi": kpi_data,
        "noeuds_critiques": [dict(r) for r in noeuds_critiques],
        "ot_actifs": [dict(r) for r in ot_actifs],
        "reseau": {
            "nb_noeuds": kpi_data.get('nb_noeuds_telecom', 0),
            "nb_liens": kpi_data.get('nb_liens_telecom', 0)
        }
    }


@router.get("/activite-reseau")
async def activite_reseau(
    jours: Optional[int] = 30,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Évolution du réseau sur les N derniers jours"""
    rows = await db.fetch("""
        SELECT DATE(date_action) AS jour,
               table_cible,
               action,
               COUNT(*) AS nb
        FROM historique_modifications
        WHERE date_action >= NOW() - ($1 || ' days')::interval
        GROUP BY DATE(date_action), table_cible, action
        ORDER BY jour
    """, str(jours))
    return {"jours": jours, "activite": [dict(r) for r in rows]}
