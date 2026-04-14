from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_get, cache_set

router = APIRouter(prefix="/dashboard")

@router.get("/kpi")
async def get_kpi(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    # Cache Redis 2 minutes
    cached = await cache_get("dashboard:kpi")
    if cached:
        return cached

    try:
        kpi = await db.fetchrow("SELECT * FROM kpi_dashboard")
    except Exception:
        kpi = None

    if kpi is None:
        return {
            "logements": {"total": 0, "total_el": 0, "el_raccordables": 0,
                          "el_raccordes": 0, "taux_couverture_pct": 0, "taux_penetration_pct": 0},
            "reseau": {"nb_noeuds_telecom": 0, "nb_noeuds_gc": 0,
                       "nb_liens_telecom": 0, "nb_liens_gc": 0},
            "travaux": {"ot_en_cours": 0, "ot_en_retard": 0},
            "commandes": {"bons_commande_attente": 0}
        }

    # Taux calculés
    total_el = kpi['total_el'] or 0
    el_raccordables = kpi['el_raccordables'] or 0
    el_raccordes = kpi['el_raccordes'] or 0

    taux_couverture = round(
        (el_raccordables / total_el * 100)
        if total_el > 0 else 0, 2
    )
    taux_penetration = round(
        (el_raccordes / el_raccordables * 100)
        if el_raccordables > 0 else 0, 2
    )

    resultat = {
        "logements": {
            "total": kpi['total_logements'],
            "total_el": total_el,
            "el_raccordables": el_raccordables,
            "el_raccordes": el_raccordes,
            "taux_couverture_pct": taux_couverture,
            "taux_penetration_pct": taux_penetration
        },
        "reseau": {
            "nb_noeuds_telecom": kpi['nb_noeuds_telecom'],
            "nb_noeuds_gc": kpi['nb_noeuds_gc'],
            "nb_liens_telecom": kpi['nb_liens_telecom'],
            "nb_liens_gc": kpi['nb_liens_gc']
        },
        "travaux": {
            "ot_en_cours": kpi['ot_en_cours'],
            "ot_en_retard": kpi['ot_en_retard']
        },
        "commercial": {
            "bons_commande_attente":
                kpi['bons_commande_attente']
        }
    }

    await cache_set("dashboard:kpi", resultat, ttl=120)
    return resultat

@router.get("/el-par-groupe")
async def el_par_groupe(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    cached = await cache_get("dashboard:el_groupe")
    if cached:
        return cached

    rows = await db.fetch("""
        SELECT
            g.code,
            g.nom,
            g.icone,
            g.couleur,
            COUNT(l.id) AS nb_logements,
            COALESCE(SUM(l.nb_el_reel), 0) AS total_el,
            COALESCE(SUM(l.nb_el_raccordes), 0)
                AS el_raccordes,
            ROUND(
                COALESCE(SUM(l.nb_el_raccordes), 0)::DECIMAL /
                NULLIF(SUM(l.nb_el_reel), 0) * 100, 2
            ) AS taux_pct
        FROM groupe_logement g
        LEFT JOIN type_logement tl ON tl.id_groupe = g.id
        LEFT JOIN logement l ON l.id_type_logement = tl.id
        GROUP BY g.id, g.code, g.nom, g.icone, g.couleur
        ORDER BY g.ordre_affichage
    """)

    resultat = [dict(r) for r in rows]
    await cache_set("dashboard:el_groupe", resultat, ttl=120)
    return resultat

@router.get("/el-par-type")
async def el_par_type(
    groupe: str = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT
            tl.code,
            tl.nom,
            tl.icone,
            tl.couleur,
            tl.el_moyen,
            g.code AS groupe_code,
            COUNT(l.id) AS nb_logements,
            COALESCE(SUM(l.nb_el_reel), 0) AS total_el,
            COALESCE(SUM(l.nb_el_raccordes), 0)
                AS el_raccordes
        FROM type_logement tl
        JOIN groupe_logement g ON g.id = tl.id_groupe
        LEFT JOIN logement l ON l.id_type_logement = tl.id
        WHERE tl.actif = TRUE
    """
    params = []
    if groupe:
        query += " AND g.code = $1"
        params.append(groupe)

    query += """
        GROUP BY tl.id, tl.code, tl.nom, tl.icone,
                 tl.couleur, tl.el_moyen, g.code
        ORDER BY total_el DESC
    """

    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/statuts-ftth")
async def statuts_ftth(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT
            statut_ftth,
            COUNT(*) AS nb_logements,
            COALESCE(SUM(nb_el_reel), 0) AS total_el
        FROM logement
        GROUP BY statut_ftth
        ORDER BY total_el DESC
    """)
    return [dict(r) for r in rows]

@router.get("/saturation-noeuds")
async def saturation_noeuds(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT
            nom_unique,
            type_noeud,
            capacite_fibres_max,
            fibres_utilisees,
            ROUND(
                fibres_utilisees::DECIMAL /
                NULLIF(capacite_fibres_max, 0) * 100, 2
            ) AS taux_saturation_pct,
            CASE
                WHEN fibres_utilisees::DECIMAL /
                     NULLIF(capacite_fibres_max,0) >= 0.9
                THEN 'critique'
                WHEN fibres_utilisees::DECIMAL /
                     NULLIF(capacite_fibres_max,0) >= 0.7
                THEN 'eleve'
                ELSE 'normal'
            END AS niveau_saturation
        FROM noeud_telecom
        WHERE etat = 'actif'
        AND capacite_fibres_max > 0
        ORDER BY taux_saturation_pct DESC
        LIMIT 20
    """)
    return [dict(r) for r in rows]

@router.get("/alertes")
async def get_alertes(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT a.*, ot.numero_ot, ot.titre
        FROM alerte_travaux a
        LEFT JOIN ordre_travail ot ON ot.id = a.id_ot
        WHERE a.lu = FALSE
        AND (a.destinataire = $1::UUID
             OR $2 = 'admin')
        ORDER BY a.date_alerte DESC
        LIMIT 20
    """, current_user['sub'], current_user['role'])

    return [dict(r) for r in rows]

@router.get("/activite-recente")
async def activite_recente(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT
            h.table_cible,
            h.action,
            h.date_action,
            u.nom,
            u.prenom,
            u.role
        FROM historique_modifications h
        LEFT JOIN utilisateur u
            ON u.id = h.utilisateur_id
        ORDER BY h.date_action DESC
        LIMIT 15
    """)
    return [dict(r) for r in rows]

@router.get("/bons-commande-pipeline")
async def bons_commande_pipeline(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin', 'chef_projet', 'commercial'
    ]:
        return []

    rows = await db.fetch("""
        SELECT
            statut,
            COUNT(*) AS nb,
            COUNT(*) FILTER (
                WHERE date_creation >= NOW() - INTERVAL '7 days'
            ) AS nb_cette_semaine
        FROM bon_commande
        GROUP BY statut
        ORDER BY nb DESC
    """)
    return [dict(r) for r in rows]


@router.get("/synthese")
async def synthese_dashboard(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """KPI plat + alertes + répartition nœuds."""
    # Flat KPI
    try:
        kpi = await db.fetchrow("SELECT * FROM kpi_dashboard")
    except Exception:
        kpi = None

    flat = {
        "nb_noeuds_telecom": kpi["nb_noeuds_telecom"] if kpi else 0,
        "nb_noeuds_gc": kpi["nb_noeuds_gc"] if kpi else 0,
        "nb_liens_telecom": kpi["nb_liens_telecom"] if kpi else 0,
        "nb_liens_gc": kpi["nb_liens_gc"] if kpi else 0,
        "total_logements": kpi["total_logements"] if kpi else 0,
        "el_raccordables": kpi["el_raccordables"] if kpi else 0,
        "el_raccordes": kpi["el_raccordes"] if kpi else 0,
        "taux_penetration_pct": round((kpi["el_raccordes"] or 0) / max(kpi["el_raccordables"] or 1, 1) * 100, 1) if kpi else 0,
        "ot_en_cours": kpi["ot_en_cours"] if kpi else 0,
        "ot_planifie": 0,
        "ot_termine": 0,
        "longueur_reseau_km": 0,
    }

    # OT stats
    try:
        ot_stats = await db.fetch("SELECT statut, COUNT(*) AS n FROM ordre_travail GROUP BY statut")
        for row in ot_stats:
            if row["statut"] == "planifie": flat["ot_planifie"] = row["n"]
            elif row["statut"] == "termine": flat["ot_termine"] = row["n"]
            elif row["statut"] == "en_cours": flat["ot_en_cours"] = row["n"]
    except Exception: pass

    # Longueur réseau
    try:
        lng = await db.fetchval("SELECT SUM(longueur_m)/1000 FROM lien_telecom WHERE longueur_m IS NOT NULL")
        flat["longueur_reseau_km"] = round(float(lng or 0), 1)
    except Exception: pass

    # Alertes saturation
    alertes = []
    try:
        nodes = await db.fetch("""
            SELECT nom_unique, type_noeud,
                   ROUND(nb_fibres_utilisees::decimal/NULLIF(capacite_fibres_max,0)*100,1) AS pct
            FROM noeud_telecom
            WHERE capacite_fibres_max > 0
              AND nb_fibres_utilisees::decimal/capacite_fibres_max >= 0.75
            ORDER BY pct DESC LIMIT 10
        """)
        for n in nodes:
            niveau = "critique" if n["pct"] >= 90 else "warning"
            alertes.append({"niveau": niveau, "message": f"Saturation {n['pct']}%",
                            "noeud": n["nom_unique"], "type": n["type_noeud"]})
    except Exception: pass

    # Répartition noeuds
    repartition = []
    try:
        rep = await db.fetch("SELECT type_noeud, COUNT(*) AS n FROM noeud_telecom GROUP BY type_noeud ORDER BY n DESC")
        repartition = [{"type": r["type_noeud"], "count": r["n"]} for r in rep]
    except Exception: pass

    return {**flat, "alertes": alertes, "repartition_noeuds": repartition}

