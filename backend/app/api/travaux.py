from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.redis import cache_delete

router = APIRouter(prefix="/travaux")

class OTCreate(BaseModel):
    titre: str
    description: Optional[str] = None
    type_travaux: str
    priorite: Optional[str] = "normale"
    date_debut_prevue: str
    date_fin_prevue: str
    adresse_chantier: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    id_equipe: Optional[str] = None
    id_noeud_telecom: Optional[str] = None
    id_noeud_gc: Optional[str] = None
    id_logement: Optional[str] = None
    cout_estime: Optional[float] = None
    devise: Optional[str] = "XOF"
    commentaire: Optional[str] = None

class OTUpdate(BaseModel):
    titre: Optional[str] = None
    statut: Optional[str] = None
    avancement_pct: Optional[int] = None
    priorite: Optional[str] = None
    date_debut_reelle: Optional[str] = None
    date_fin_reelle: Optional[str] = None
    cout_reel: Optional[float] = None
    commentaire: Optional[str] = None

class TacheCreate(BaseModel):
    id_ot: str
    titre: str
    description: Optional[str] = None
    ordre: Optional[int] = 0
    assignee_a: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None

class RapportCreate(BaseModel):
    id_ot: str
    date_rapport: str
    avancement_jour_pct: Optional[int] = None
    travaux_realises: str
    travaux_prevus_demain: Optional[str] = None
    problemes_rencontres: Optional[str] = None
    meteo: Optional[str] = None
    nb_ouvriers: Optional[int] = None
    heures_travaillees: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/ot")
async def liste_ot(
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    id_equipe: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    query = """
        SELECT
            ot.id, ot.numero_ot, ot.titre,
            ot.type_travaux, ot.priorite,
            ot.statut, ot.avancement_pct,
            ot.date_debut_prevue,
            ot.date_fin_prevue,
            ot.date_debut_reelle,
            ot.date_fin_reelle,
            ot.adresse_chantier,
            ot.cout_estime, ot.cout_reel,
            ot.devise, ot.date_creation,
            e.nom AS equipe_nom,
            u.nom AS responsable_nom,
            u.prenom AS responsable_prenom,
            CASE
                WHEN ot.date_fin_prevue < CURRENT_DATE
                AND ot.statut NOT IN (
                    'termine','cloture','annule'
                )
                THEN TRUE ELSE FALSE
            END AS en_retard,
            (CURRENT_DATE - ot.date_fin_prevue)
                FILTER (
                    WHERE ot.date_fin_prevue < CURRENT_DATE
                    AND ot.statut NOT IN (
                        'termine','cloture','annule'
                    )
                ) AS jours_retard
        FROM ordre_travail ot
        LEFT JOIN equipe_travaux e
            ON e.id = ot.id_equipe
        LEFT JOIN utilisateur u
            ON u.id = ot.id_responsable
        WHERE 1=1
    """
    params = []
    i = 1

    if statut:
        query += f" AND ot.statut = ${i}"
        params.append(statut)
        i += 1

    if priorite:
        query += f" AND ot.priorite = ${i}"
        params.append(priorite)
        i += 1

    if id_equipe:
        query += f" AND ot.id_equipe = ${i}"
        params.append(id_equipe)

    query += " ORDER BY ot.date_creation DESC"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.get("/ot/{ot_id}")
async def get_ot(
    ot_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    ot = await db.fetchrow("""
        SELECT ot.*,
            e.nom AS equipe_nom,
            u.nom AS responsable_nom,
            u.prenom AS responsable_prenom
        FROM ordre_travail ot
        LEFT JOIN equipe_travaux e
            ON e.id = ot.id_equipe
        LEFT JOIN utilisateur u
            ON u.id = ot.id_responsable
        WHERE ot.id = $1
    """, ot_id)

    if not ot:
        raise HTTPException(404, "OT non trouvé")

    taches = await db.fetch("""
        SELECT t.*, u.nom, u.prenom
        FROM tache_travail t
        LEFT JOIN utilisateur u
            ON u.id = t.assignee_a
        WHERE t.id_ot = $1
        ORDER BY t.ordre
    """, ot_id)

    rapports = await db.fetch("""
        SELECT r.*, u.nom, u.prenom
        FROM rapport_journalier r
        LEFT JOIN utilisateur u
            ON u.id = r.redige_par
        WHERE r.id_ot = $1
        ORDER BY r.date_rapport DESC
    """, ot_id)

    return {
        **dict(ot),
        "taches": [dict(t) for t in taches],
        "rapports": [dict(r) for r in rapports]
    }

@router.post("/ot")
async def creer_ot(
    data: OTCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user['role'] not in [
        'admin','chef_projet','technicien'
    ]:
        raise HTTPException(403, "Permission refusée")

    geom_sql = (
        f"ST_SetSRID(ST_MakePoint("
        f"{data.longitude},{data.latitude}),4326)"
        if data.latitude and data.longitude
        else "NULL"
    )

    row = await db.fetchrow(f"""
        INSERT INTO ordre_travail
            (titre, description, type_travaux,
             priorite, date_debut_prevue,
             date_fin_prevue, adresse_chantier,
             geom_point, id_equipe,
             id_noeud_telecom, id_noeud_gc,
             id_logement, cout_estime,
             devise, commentaire, cree_par)
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            {geom_sql},
            $8,$9,$10,$11,$12,$13,$14,$15
        )
        RETURNING id, numero_ot, titre, statut
    """,
    data.titre, data.description,
    data.type_travaux, data.priorite,
    data.date_debut_prevue, data.date_fin_prevue,
    data.adresse_chantier,
    data.id_equipe, data.id_noeud_telecom,
    data.id_noeud_gc, data.id_logement,
    data.cout_estime, data.devise,
    data.commentaire, current_user['sub'])

    return dict(row)

@router.put("/ot/{ot_id}")
async def modifier_ot(
    ot_id: str,
    data: OTUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
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
        f"UPDATE ordre_travail "
        f"SET {set_clause}, date_modification=NOW() "
        f"WHERE id = $1",
        ot_id, *values
    )
    return {"message": "OT modifié avec succès"}

@router.post("/taches")
async def creer_tache(
    data: TacheCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    row = await db.fetchrow("""
        INSERT INTO tache_travail
            (id_ot, titre, description,
             ordre, assignee_a,
             date_debut, date_fin)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id, titre, statut
    """,
    data.id_ot, data.titre, data.description,
    data.ordre, data.assignee_a,
    data.date_debut, data.date_fin)

    return dict(row)

@router.put("/taches/{tache_id}/avancement")
async def maj_avancement_tache(
    tache_id: str,
    avancement: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if not 0 <= avancement <= 100:
        raise HTTPException(
            400, "Avancement entre 0 et 100"
        )

    statut = (
        "terminee" if avancement == 100
        else "en_cours" if avancement > 0
        else "a_faire"
    )

    await db.execute("""
        UPDATE tache_travail
        SET avancement_pct = $1,
            statut = $2
        WHERE id = $3
    """, avancement, statut, tache_id)

    return {"message": "Avancement mis à jour"}

@router.post("/rapports")
async def creer_rapport(
    data: RapportCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    geom_sql = (
        f"ST_SetSRID(ST_MakePoint("
        f"{data.longitude},{data.latitude}),4326)"
        if data.latitude and data.longitude
        else "NULL"
    )

    row = await db.fetchrow(f"""
        INSERT INTO rapport_journalier
            (id_ot, date_rapport,
             avancement_jour_pct,
             travaux_realises,
             travaux_prevus_demain,
             problemes_rencontres,
             meteo, nb_ouvriers,
             heures_travaillees,
             geom, redige_par)
        VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,{geom_sql},$10
        )
        RETURNING id, date_rapport
    """,
    data.id_ot, data.date_rapport,
    data.avancement_jour_pct,
    data.travaux_realises,
    data.travaux_prevus_demain,
    data.problemes_rencontres,
    data.meteo, data.nb_ouvriers,
    data.heures_travaillees,
    current_user['sub'])

    return dict(row)

@router.get("/equipes")
async def liste_equipes(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT e.*,
            u.nom AS chef_nom,
            u.prenom AS chef_prenom
        FROM equipe_travaux e
        LEFT JOIN utilisateur u
            ON u.id = e.chef_equipe
        WHERE e.actif = TRUE
        ORDER BY e.nom
    """)
    return [dict(r) for r in rows]

@router.get("/alertes")
async def alertes_travaux(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    rows = await db.fetch("""
        SELECT a.*, ot.numero_ot, ot.titre
        FROM alerte_travaux a
        LEFT JOIN ordre_travail ot ON ot.id = a.id_ot
        WHERE a.lu = FALSE
        ORDER BY a.date_alerte DESC
        LIMIT 50
    """)
    return [dict(r) for r in rows]

@router.put("/alertes/{alerte_id}/lue")
async def marquer_alerte_lue(
    alerte_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    await db.execute(
        "UPDATE alerte_travaux SET lu=TRUE WHERE id=$1",
        alerte_id
    )
    return {"message": "Alerte marquée comme lue"}
