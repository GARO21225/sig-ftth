from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
import uuid, os, json
from app.core.database import get_db
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/import-dwg")

UPLOAD_DIR = "/app/uploads"


@router.get("")
async def lister_imports(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT i.id, i.nom_fichier, i.date_import, i.statut_import,
               i.statut_validation, i.nb_erreurs, i.nb_corrigees,
               i.systeme_projection, u.email AS importe_par
        FROM import_dwg i
        LEFT JOIN utilisateur u ON i.utilisateur_import = u.id
        ORDER BY i.date_import DESC LIMIT 50
    """)
    return [dict(r) for r in rows]


@router.get("/{import_id}/rapport")
async def rapport_import(
    import_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    imp = await db.fetchrow(
        "SELECT * FROM import_dwg WHERE id=$1", import_id
    )
    if not imp:
        raise HTTPException(404, "Import introuvable")

    erreurs = await db.fetch("""
        SELECT type_erreur, objet, description, niveau,
               ST_AsGeoJSON(geom)::json AS geom
        FROM rapport_import WHERE id_import=$1
        ORDER BY niveau DESC, type_erreur
    """, import_id)

    return {
        "import": dict(imp),
        "rapport": [dict(e) for e in erreurs],
        "resume": {
            "total_erreurs": len(erreurs),
            "bloquantes": sum(1 for e in erreurs if e["niveau"] == "bloquant"),
            "warnings": sum(1 for e in erreurs if e["niveau"] == "warning"),
        }
    }


@router.post("/valider-geojson")
async def valider_geojson(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
    nom_fichier: str = Form(...),
    geojson_content: str = Form(...),
    systeme_projection: Optional[str] = Form("EPSG:4326"),
    mode_validation: Optional[str] = Form("strict"),
):
    """
    Valide un GeoJSON (issu d'une conversion DWG) selon les contraintes
    topologiques et attributaires du PCR v2.5.
    """
    import_id = str(uuid.uuid4())
    erreurs = []
    stats = {"noeuds": 0, "liens": 0, "erreurs_topo": 0, "erreurs_attr": 0}

    try:
        data = json.loads(geojson_content)
    except Exception:
        raise HTTPException(400, "JSON invalide")

    features = data.get("features", [])

    for i, feature in enumerate(features):
        geom = feature.get("geometry", {})
        props = feature.get("properties", {}) or {}
        geom_type = geom.get("type", "")
        label = props.get("nom_unique") or props.get("name") or f"feature_{i}"

        # Validation géométrie via PostGIS
        try:
            geom_str = json.dumps(geom)
            valide = await db.fetchval(
                "SELECT ST_IsValid(ST_GeomFromGeoJSON($1))", geom_str
            )
            if not valide:
                raison = await db.fetchval(
                    "SELECT ST_IsValidReason(ST_GeomFromGeoJSON($1))", geom_str
                )
                erreurs.append({
                    "type_erreur": "geometrie_invalide",
                    "objet": label,
                    "description": f"Géométrie invalide : {raison}",
                    "niveau": "bloquant"
                })
                stats["erreurs_topo"] += 1
        except Exception as e:
            erreurs.append({
                "type_erreur": "geometrie_illisible",
                "objet": label,
                "description": str(e),
                "niveau": "bloquant"
            })
            stats["erreurs_topo"] += 1
            continue

        # Validation attributaire — champs obligatoires
        if geom_type == "Point":
            stats["noeuds"] += 1
            if not props.get("nom_unique") and not props.get("name"):
                erreurs.append({
                    "type_erreur": "attribut_manquant",
                    "objet": label,
                    "description": "Champ 'nom_unique' obligatoire absent",
                    "niveau": "bloquant"
                })
                stats["erreurs_attr"] += 1
            if not props.get("type_noeud") and not props.get("type"):
                erreurs.append({
                    "type_erreur": "attribut_manquant",
                    "objet": label,
                    "description": "Champ 'type_noeud' obligatoire absent",
                    "niveau": "warning"
                })
                stats["erreurs_attr"] += 1

        elif geom_type == "LineString":
            stats["liens"] += 1
            coords = geom.get("coordinates", [])
            if len(coords) < 2:
                erreurs.append({
                    "type_erreur": "lien_invalide",
                    "objet": label,
                    "description": "Lien doit avoir au moins 2 points",
                    "niveau": "bloquant"
                })
                stats["erreurs_topo"] += 1
            # Vérifier cohérence fibres
            nb_fibres = props.get("nb_fibres")
            fibres_util = props.get("fibres_utilisees")
            if nb_fibres and fibres_util and fibres_util > nb_fibres:
                erreurs.append({
                    "type_erreur": "coherence_attributaire",
                    "objet": label,
                    "description": f"fibres_utilisees ({fibres_util}) > nb_fibres ({nb_fibres})",
                    "niveau": "bloquant"
                })
                stats["erreurs_attr"] += 1

    # Enregistrer le rapport en base
    statut_valid = "echec" if any(e["niveau"] == "bloquant" for e in erreurs) else (
        "warning" if erreurs else "valide"
    )
    statut_import = "en_attente" if statut_valid != "echec" else "rejete"

    imp_id = await db.fetchval("""
        INSERT INTO import_dwg
            (nom_fichier, utilisateur_import, systeme_projection,
             statut_import, statut_validation, nb_erreurs, log_import)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
    """,
    nom_fichier, current_user["sub"], systeme_projection,
    statut_import, statut_valid, len(erreurs),
    json.dumps(stats))

    for e in erreurs:
        await db.execute("""
            INSERT INTO rapport_import
                (id_import, type_erreur, objet, description, niveau)
            VALUES ($1,$2,$3,$4,$5)
        """, imp_id, e["type_erreur"], e["objet"], e["description"], e["niveau"])

    if mode_validation == "strict" and statut_valid == "echec":
        return {
            "import_id": str(imp_id),
            "statut": "rejete",
            "message": "Validation échouée — erreurs bloquantes détectées",
            "stats": stats,
            "erreurs": erreurs
        }

    return {
        "import_id": str(imp_id),
        "statut": statut_valid,
        "stats": stats,
        "nb_erreurs": len(erreurs),
        "erreurs_bloquantes": sum(1 for e in erreurs if e["niveau"] == "bloquant"),
        "erreurs_warning": sum(1 for e in erreurs if e["niveau"] == "warning"),
        "erreurs": erreurs
    }


@router.post("/{import_id}/integrer")
async def integrer_import(
    import_id: str,
    geojson_content: str = Form(...),
    current_user: dict = Depends(require_role("admin", "chef_projet")),
    db=Depends(get_db)
):
    """Intègre les features validées dans les tables PostGIS."""
    imp = await db.fetchrow(
        "SELECT * FROM import_dwg WHERE id=$1", import_id
    )
    if not imp:
        raise HTTPException(404, "Import introuvable")
    if imp["statut_validation"] not in ("valide", "warning"):
        raise HTTPException(400, "Validation requise avant intégration")

    try:
        data = json.loads(geojson_content)
    except Exception:
        raise HTTPException(400, "JSON invalide")

    noeuds_ok, liens_ok, erreurs = 0, 0, []

    for feature in data.get("features", []):
        geom = feature.get("geometry", {})
        props = feature.get("properties", {}) or {}
        geom_type = geom.get("type", "")
        geom_str = json.dumps(geom)
        nom = props.get("nom_unique") or props.get("name") or str(uuid.uuid4())[:8]

        try:
            if geom_type == "Point":
                await db.execute("""
                    INSERT INTO noeud_telecom
                        (nom_unique, type_noeud, geom, etat, cree_par)
                    VALUES ($1, $2,
                        ST_SetSRID(ST_GeomFromGeoJSON($3),4326),
                        'actif', $4)
                    ON CONFLICT (nom_unique) DO NOTHING
                """,
                nom,
                props.get("type_noeud") or props.get("type") or "inconnu",
                geom_str, current_user["sub"])
                noeuds_ok += 1

            elif geom_type == "LineString":
                await db.execute("""
                    INSERT INTO lien_telecom
                        (nom_unique, type_lien, geom, etat, cree_par)
                    VALUES ($1, $2,
                        ST_SetSRID(ST_GeomFromGeoJSON($3),4326),
                        'actif', $4)
                    ON CONFLICT (nom_unique) DO NOTHING
                """,
                nom,
                props.get("type_lien") or props.get("type") or "optique",
                geom_str, current_user["sub"])
                liens_ok += 1
        except Exception as e:
            erreurs.append({"objet": nom, "erreur": str(e)})

    await db.execute("""
        UPDATE import_dwg SET statut_import='integre' WHERE id=$1
    """, import_id)

    return {
        "import_id": import_id,
        "statut": "integre",
        "noeuds_inseres": noeuds_ok,
        "liens_inseres": liens_ok,
        "erreurs": erreurs
    }


@router.post("/normaliser-ia")
async def normaliser_couches_ia(
    current_user: dict = Depends(get_current_user),
    geojson_content: str = Form(...),
):
    """
    Normalisation intelligente des couches DWG via fuzzy matching.
    Déduit automatiquement le type de nœud selon le nom de la couche.
    """
    try:
        from rapidfuzz import process, fuzz
    except ImportError:
        raise HTTPException(501, "rapidfuzz non installé")

    DICTIONNAIRE_FTTH = {
        "NRO": ["NRO","NOEUD_RACCORDEMENT","NODE_OLT","NRO_","CENTRAL"],
        "SRO": ["SRO","SOUS_REPARTITEUR","SUBREPART","PM_DIST"],
        "PBO": ["PBO","POINT_BRANCHEMENT","PB","BOITIER","SPLICE"],
        "PTO": ["PTO","PRISE_TERMINALE","ONT","MODEM","TERMINAISON"],
        "PM": ["PM","POINT_MUTUALISATION","MUTU","PMZ"],
        "CAB_OPT": ["CABLE","OPTIQUE","FIBRE","TRUNK","FEEDER","DISTRIB"],
        "L1T": ["L1T","CHAMBRE_L1","CHAMBRE1","CH_L1"],
        "L2T": ["L2T","CHAMBRE_L2","CHAMBRE2","CH_L2"],
        "L4T": ["L4T","CHAMBRE_L4","CHAMBRE4"],
        "FOURREAU": ["FOURREAU","CONDUITE","GAINE","PIPE"],
        "POTEAU": ["POTEAU","APPUI","PYLONE","MAST"],
    }

    try:
        data = json.loads(geojson_content)
    except Exception:
        raise HTTPException(400, "JSON invalide")

    features = data.get("features", [])
    resultats = []

    for feature in features:
        props = feature.get("properties", {}) or {}
        nom_couche = (
            props.get("layer") or props.get("nom_couche") or
            props.get("Layer") or props.get("NAME") or
            props.get("nom_unique") or "inconnu"
        ).upper().replace(" ", "_").replace("-", "_")

        best_type, best_score = "inconnu", 0
        for type_code, synonymes in DICTIONNAIRE_FTTH.items():
            score = process.extractOne(nom_couche, synonymes, scorer=fuzz.token_sort_ratio)
            if score and score[1] > best_score:
                best_score = score[1]
                best_type = type_code

        resultats.append({
            "nom_couche_original": props.get("layer") or props.get("nom_couche") or "?",
            "type_deduit": best_type if best_score >= 55 else "non_reconnu",
            "confiance_pct": best_score,
            "geometrie": feature.get("geometry", {}).get("type"),
        })

    types_reconnus = sum(1 for r in resultats if r["type_deduit"] != "non_reconnu")
    return {
        "total_features": len(features),
        "types_reconnus": types_reconnus,
        "taux_reconnaissance_pct": round(types_reconnus/max(len(features),1)*100, 1),
        "resultats": resultats,
        "dictionnaire_utilise": list(DICTIONNAIRE_FTTH.keys())
    }
