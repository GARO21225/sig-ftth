from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.redis import cache_get, cache_set

router = APIRouter(prefix="/eligibilite")

class EligibiliteRequest(BaseModel):
    adresse: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class BonCommandeRequest(BaseModel):
    nom: str
    prenom: str
    telephone: str
    email: Optional[str] = None
    adresse: str
    commune: Optional[str] = None
    offre: Optional[str] = None
    id_pbo: Optional[str] = None
    commentaire: Optional[str] = None

def determiner_eligibilite(pbo, logement):
    if logement and logement['statut_ftth'] == 'raccorde':
        return (
            'immediat',
            '✅ Votre adresse est déjà raccordée ! '
            'Souscrivez dès maintenant.',
            'Immédiat'
        )
    if (pbo and pbo['distance_m'] <= 300
            and pbo['fibres_dispo'] > 0):
        return (
            'immediat',
            f'🎉 Éligible ! PBO à '
            f'{pbo["distance_m"]:.0f}m avec '
            f'{pbo["fibres_dispo"]} fibre(s) disponible(s).',
            '2 à 4 semaines'
        )
    if (pbo and pbo['distance_m'] <= 300
            and pbo['fibres_dispo'] == 0):
        return (
            'planifie',
            '📅 Zone bientôt éligible. '
            'Extension planifiée prochainement.',
            '3 à 6 mois'
        )
    if pbo and pbo['distance_m'] <= 1000:
        return (
            'en_etude',
            '🔍 Zone en cours d\'étude. '
            'Laissez vos coordonnées.',
            '6 à 12 mois'
        )
    return (
        'non_eligible',
        '❌ Zone non encore couverte. '
        'Inscrivez-vous pour être notifié.',
        None
    )

def get_offres(niveau: str):
    if niveau not in ['immediat', 'planifie']:
        return []
    return [
        {
            "nom": "Fibre Essentiel",
            "debit": "100 Mb/s",
            "prix": "15 000 XOF/mois",
            "promo": None
        },
        {
            "nom": "Fibre Confort",
            "debit": "300 Mb/s",
            "prix": "25 000 XOF/mois",
            "promo": "1 mois offert"
        },
        {
            "nom": "Fibre Premium",
            "debit": "1 Gb/s",
            "prix": "45 000 XOF/mois",
            "promo": "Installation offerte"
        }
    ]

@router.post("/verifier")
async def verifier_eligibilite(
    data: EligibiliteRequest,
    db=Depends(get_db)
):
    if not data.lat and not data.adresse:
        return {
            "eligible": False,
            "niveau": "non_eligible",
            "adresse": "Non renseignée",
            "message_commercial":
                "Veuillez fournir une adresse ou position GPS."
        }

    cache_key = (
        f"eligibilite:{data.adresse or ''}"
        f"{data.lat or ''},{data.lng or ''}"
    )
    cached = await cache_get(cache_key)
    if cached:
        return cached

    lat = data.lat or 5.3599
    lng = data.lng or -4.0083
    adresse = data.adresse or "Position GPS"

    # PBO le plus proche
    pbo = await db.fetchrow("""
        SELECT
            nt.id,
            nt.nom_unique,
            nt.capacite_fibres_max,
            nt.fibres_utilisees,
            (nt.capacite_fibres_max - nt.fibres_utilisees)
                AS fibres_dispo,
            ST_Distance(
                ST_Transform(nt.geom, 3857),
                ST_Transform(
                    ST_SetSRID(ST_MakePoint($1,$2),4326),
                    3857
                )
            ) AS distance_m
        FROM noeud_telecom nt
        WHERE nt.type_noeud = 'PBO'
        AND nt.etat = 'actif'
        ORDER BY distance_m ASC
        LIMIT 1
    """, lng, lat)

    # Logement existant
    logement = await db.fetchrow("""
        SELECT l.id, tl.nom AS type_logement,
               l.nb_el_reel, l.statut_ftth
        FROM logement l
        JOIN type_logement tl
            ON tl.id = l.id_type_logement
        WHERE ST_DWithin(
            ST_Transform(l.geom, 3857),
            ST_Transform(
                ST_SetSRID(ST_MakePoint($1,$2),4326),
                3857
            ),
            100
        )
        ORDER BY ST_Distance(
            ST_Transform(l.geom, 3857),
            ST_Transform(
                ST_SetSRID(ST_MakePoint($1,$2),4326),
                3857
            )
        ) ASC
        LIMIT 1
    """, lng, lat)

    niveau, message, delai = determiner_eligibilite(
        pbo, logement
    )

    resultat = {
        "eligible": niveau in ['immediat', 'planifie'],
        "niveau": niveau,
        "adresse": adresse,
        "pbo_proche": {
            "nom": pbo['nom_unique'],
            "distance_m": float(pbo['distance_m']),
            "fibres_dispo": int(pbo['fibres_dispo'])
        } if pbo else None,
        "logement": {
            "type": logement['type_logement'],
            "nb_el": logement['nb_el_reel'],
            "statut_ftth": logement['statut_ftth']
        } if logement else None,
        "delai_estime": delai,
        "offres_disponibles": get_offres(niveau),
        "message_commercial": message,
        "contact_commercial": "+225 27 00 00 00 00"
    }

    await cache_set(cache_key, resultat, ttl=300)
    return resultat

@router.post("/bon-commande")
async def creer_bon_commande(
    data: BonCommandeRequest,
    db=Depends(get_db)
):
    await db.execute("""
        INSERT INTO bon_commande
            (nom, prenom, telephone, email,
             adresse, commune, offre, commentaire)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    """,
    data.nom, data.prenom, data.telephone,
    data.email, data.adresse, data.commune,
    data.offre, data.commentaire)

    # Notifier commercial
    await db.execute("""
        INSERT INTO notification_email
            (destinataire_email, type_email,
             sujet, corps_html)
        VALUES (
            'commercial@sig-ftth.ci',
            'alerte_travaux',
            '🔔 Nouveau bon de commande FTTH',
            $1
        )
    """, f"""
        <h2>Nouveau bon de commande</h2>
        <p><b>Client :</b>
           {data.prenom} {data.nom}</p>
        <p><b>Téléphone :</b> {data.telephone}</p>
        <p><b>Email :</b>
           {data.email or 'Non renseigné'}</p>
        <p><b>Adresse :</b> {data.adresse}</p>
        <p><b>Offre :</b>
           {data.offre or 'Non choisie'}</p>
    """)

    return {
        "message": "Demande envoyée ! "
                   "Un commercial vous contactera sous 24h.",
        "statut": "en_attente"
    }

@router.get("/bons-commande")
async def liste_bons_commande(
    statut: Optional[str] = None,
    db=Depends(get_db)
):
    query = "SELECT * FROM bon_commande"
    params = []
    if statut:
        query += " WHERE statut = $1"
        params.append(statut)
    query += " ORDER BY date_creation DESC LIMIT 100"

    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]
