CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MODULE 2 : RÉSEAU TÉLÉCOM
-- ============================================

CREATE TABLE IF NOT EXISTS noeud_telecom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_unique VARCHAR(100) UNIQUE NOT NULL,
    type_noeud VARCHAR(50) CHECK (type_noeud IN (
        'NRO','SRO','PBO','PTO','PM','CLIENT'
    )),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    capacite_fibres_max INTEGER,
    fibres_utilisees INTEGER DEFAULT 0,
    nb_ports INTEGER,
    ports_utilises INTEGER DEFAULT 0,
    marque VARCHAR(100),
    modele VARCHAR(100),
    etat VARCHAR(50) DEFAULT 'actif' CHECK (etat IN (
        'actif','inactif','en_travaux',
        'hors_service','planifie'
    )),
    date_pose DATE,
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    cree_par UUID REFERENCES utilisateur(id),
    CONSTRAINT chk_fibres_max
        CHECK (fibres_utilisees <= capacite_fibres_max),
    CONSTRAINT chk_ports_max
        CHECK (ports_utilises <= nb_ports)
);
CREATE INDEX IF NOT EXISTS idx_noeud_telecom_geom
    ON noeud_telecom USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_noeud_telecom_type
    ON noeud_telecom(type_noeud);

CREATE TABLE IF NOT EXISTS lien_telecom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_unique VARCHAR(100) UNIQUE NOT NULL,
    id_noeud_depart UUID
        REFERENCES noeud_telecom(id) NOT NULL,
    id_noeud_arrivee UUID
        REFERENCES noeud_telecom(id) NOT NULL,
    type_lien VARCHAR(50) CHECK (type_lien IN (
        'transport','distribution',
        'branchement','jarretiere'
    )),
    type_cable VARCHAR(100),
    nb_fibres INTEGER,
    fibres_utilisees INTEGER DEFAULT 0,
    longueur_m FLOAT,
    id_lien_gc UUID,
    geom GEOMETRY(LINESTRING, 4326),
    etat VARCHAR(50) DEFAULT 'actif',
    date_pose DATE,
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    cree_par UUID REFERENCES utilisateur(id),
    CONSTRAINT chk_fibres_lien
        CHECK (fibres_utilisees <= nb_fibres),
    CONSTRAINT chk_noeuds_diff
        CHECK (id_noeud_depart != id_noeud_arrivee)
);
CREATE INDEX IF NOT EXISTS idx_lien_telecom_geom
    ON lien_telecom USING GIST(geom);

-- ============================================
-- MODULE 3 : GÉNIE CIVIL
-- ============================================

CREATE TABLE IF NOT EXISTS noeud_gc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_unique VARCHAR(100) UNIQUE NOT NULL,
    type_noeud VARCHAR(50) CHECK (type_noeud IN (
        'chambre','regard','appui_poteau',
        'point_entree_immeuble','borne'
    )),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    dimension VARCHAR(50),
    profondeur_cm INTEGER,
    nb_fourreaux INTEGER,
    fourreaux_occupes INTEGER DEFAULT 0,
    materiau VARCHAR(100),
    etat VARCHAR(50) DEFAULT 'actif',
    date_pose DATE,
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    cree_par UUID REFERENCES utilisateur(id),
    CONSTRAINT chk_fourreaux
        CHECK (fourreaux_occupes <= nb_fourreaux)
);
CREATE INDEX IF NOT EXISTS idx_noeud_gc_geom
    ON noeud_gc USING GIST(geom);

CREATE TABLE IF NOT EXISTS lien_gc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_unique VARCHAR(100) UNIQUE NOT NULL,
    id_noeud_depart UUID
        REFERENCES noeud_gc(id) NOT NULL,
    id_noeud_arrivee UUID
        REFERENCES noeud_gc(id) NOT NULL,
    type_lien VARCHAR(50) CHECK (type_lien IN (
        'fourreau','aerien','micro_tranchee',
        'chemin_cables','gaine'
    )),
    nb_fourreaux INTEGER,
    fourreaux_occupes INTEGER DEFAULT 0,
    diametre_mm INTEGER,
    materiau VARCHAR(100),
    longueur_m FLOAT,
    profondeur_cm INTEGER,
    geom GEOMETRY(LINESTRING, 4326),
    etat VARCHAR(50) DEFAULT 'actif',
    date_pose DATE,
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    cree_par UUID REFERENCES utilisateur(id),
    CONSTRAINT chk_fourreaux_lien
        CHECK (fourreaux_occupes <= nb_fourreaux),
    CONSTRAINT chk_noeuds_gc_diff
        CHECK (id_noeud_depart != id_noeud_arrivee)
);
CREATE INDEX IF NOT EXISTS idx_lien_gc_geom
    ON lien_gc USING GIST(geom);

ALTER TABLE lien_telecom
    DROP CONSTRAINT IF EXISTS fk_lien_gc;
ALTER TABLE lien_telecom
    ADD CONSTRAINT fk_lien_gc
    FOREIGN KEY (id_lien_gc) REFERENCES lien_gc(id);

-- ============================================
-- MODULE 4 : LOGEMENTS & ÉQUIVALENTS
-- ============================================

CREATE TABLE IF NOT EXISTS groupe_logement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    icone VARCHAR(50),
    couleur VARCHAR(20),
    ordre_affichage INTEGER DEFAULT 0
);

INSERT INTO groupe_logement
    (code, nom, icone, couleur, ordre_affichage)
VALUES
    ('PAVILLON','Pavillon','🏠','#F59E0B',1),
    ('IMMEUBLE','Immeuble','🏢','#3B82F6',2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS type_logement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_groupe UUID
        REFERENCES groupe_logement(id) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    nom VARCHAR(150) NOT NULL,
    el_moyen DECIMAL(6,2) DEFAULT 1.0,
    taux_penetration_cible DECIMAL(5,2) DEFAULT 30.0,
    nb_logements_moyen INTEGER,
    icone VARCHAR(50),
    couleur VARCHAR(20),
    actif BOOLEAN DEFAULT TRUE
);

INSERT INTO type_logement
    (id_groupe, code, nom, el_moyen,
     taux_penetration_cible,
     nb_logements_moyen, icone, couleur)
SELECT g.id, v.code, v.nom,
       v.el, v.taux, v.log, v.icone, v.couleur
FROM groupe_logement g,
(VALUES
    ('VILLA_SIMPLE','Villa individuelle',
     1.0,35.0,1,'🏠','#F59E0B'),
    ('VILLA_DUPLEX','Villa duplex',
     2.0,35.0,2,'🏡','#F97316'),
    ('VILLA_TRIPLEX','Villa triplex',
     3.0,30.0,3,'🏘️','#EA580C'),
    ('COURS_COMMUNE','Cours commune',
     6.0,25.0,6,'🏚️','#DC2626'),
    ('MAISON_BASSE','Maison basse',
     1.0,30.0,1,'🏠','#D97706'),
    ('BUNGALOW','Bungalow',
     1.0,40.0,1,'⛺','#B45309'),
    ('VILLA_CLOTUREE','Villa clôturée',
     1.0,45.0,1,'🏰','#92400E')
) AS v(code,nom,el,taux,log,icone,couleur)
WHERE g.code = 'PAVILLON'
ON CONFLICT (code) DO NOTHING;

INSERT INTO type_logement
    (id_groupe, code, nom, el_moyen,
     taux_penetration_cible,
     nb_logements_moyen, icone, couleur)
SELECT g.id, v.code, v.nom,
       v.el, v.taux, v.log, v.icone, v.couleur
FROM groupe_logement g,
(VALUES
    ('IMM_RESIDENTIEL','Immeuble résidentiel',
     24.0,50.0,24,'🏢','#3B82F6'),
    ('IMM_BUREAUX','Immeuble de bureaux',
     12.0,60.0,12,'🏦','#1D4ED8'),
    ('IMM_MIXTE','Immeuble mixte',
     18.0,55.0,18,'🏬','#4F46E5'),
    ('RESIDENCE','Résidence fermée',
     36.0,65.0,36,'🏙️','#7C3AED'),
    ('TOUR','Tour / Grand ensemble',
     60.0,70.0,60,'🗼','#6D28D9'),
    ('VILLA_STANDING','Villa standing copro',
     4.0,55.0,4,'🏯','#5B21B6'),
    ('CITE_OUVRIERE','Cité ouvrière',
     48.0,20.0,48,'🏗️','#1E40AF')
) AS v(code,nom,el,taux,log,icone,couleur)
WHERE g.code = 'IMMEUBLE'
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS logement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_unique VARCHAR(150) UNIQUE NOT NULL,
    id_type_logement UUID
        REFERENCES type_logement(id) NOT NULL,
    geom GEOMETRY(POINT, 4326) NOT NULL,
    adresse TEXT,
    quartier VARCHAR(150),
    commune VARCHAR(150),
    nb_el_reel INTEGER NOT NULL DEFAULT 1,
    nb_el_raccordables INTEGER,
    nb_el_raccordes INTEGER DEFAULT 0,
    nb_el_en_cours INTEGER DEFAULT 0,
    statut_ftth VARCHAR(50) DEFAULT 'non_prevu'
        CHECK (statut_ftth IN (
            'raccorde','en_cours','prevu',
            'non_prevu','refuse','inaccessible'
        )),
    id_pbo UUID REFERENCES noeud_telecom(id),
    id_pei UUID REFERENCES noeud_gc(id),
    commentaire TEXT,
    cree_par UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_logement_geom
    ON logement USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_logement_statut
    ON logement(statut_ftth);

-- ============================================
-- MODULE 5 : CATALOGUE ÉQUIPEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS categorie_equipement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) UNIQUE NOT NULL,
    icone VARCHAR(50),
    couleur VARCHAR(20),
    reseau VARCHAR(50) CHECK (reseau IN (
        'telecom','gc','energie','securite','autre'
    )),
    actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS type_equipement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    id_categorie UUID
        REFERENCES categorie_equipement(id),
    geom_type VARCHAR(20) CHECK (geom_type IN (
        'POINT','LINESTRING','POLYGON'
    )),
    est_standard BOOLEAN DEFAULT FALSE,
    statut VARCHAR(30) DEFAULT 'en_attente' CHECK (statut IN (
        'en_attente','valide','rejete','archive'
    )),
    icone VARCHAR(50),
    couleur VARCHAR(20),
    cree_par UUID REFERENCES utilisateur(id),
    valide_par UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attribut_type_equipement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_type_equipement UUID
        REFERENCES type_equipement(id) ON DELETE CASCADE,
    nom_champ VARCHAR(100) NOT NULL,
    label_affichage VARCHAR(150) NOT NULL,
    type_donnee VARCHAR(30) CHECK (type_donnee IN (
        'texte','nombre','decimal','booleen',
        'date','liste','url','email'
    )),
    valeurs_liste JSONB,
    valeur_defaut TEXT,
    obligatoire BOOLEAN DEFAULT FALSE,
    ordre_affichage INTEGER DEFAULT 0,
    unite VARCHAR(50),
    UNIQUE(id_type_equipement, nom_champ)
);

CREATE TABLE IF NOT EXISTS equipement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_unique VARCHAR(150) UNIQUE NOT NULL,
    id_type_equipement UUID
        REFERENCES type_equipement(id) NOT NULL,
    geom_point GEOMETRY(POINT, 4326),
    geom_ligne GEOMETRY(LINESTRING, 4326),
    etat VARCHAR(50) DEFAULT 'actif',
    date_pose DATE,
    marque VARCHAR(100),
    modele VARCHAR(100),
    numero_serie VARCHAR(100),
    attributs_custom JSONB DEFAULT '{}',
    id_noeud_telecom UUID REFERENCES noeud_telecom(id),
    id_noeud_gc UUID REFERENCES noeud_gc(id),
    id_logement UUID REFERENCES logement(id),
    commentaire TEXT,
    photos JSONB DEFAULT '[]',
    cree_par UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_equipement_geom
    ON equipement USING GIST(geom_point);
CREATE INDEX IF NOT EXISTS idx_equipement_custom
    ON equipement USING GIN(attributs_custom);

CREATE TABLE IF NOT EXISTS demande_equipement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_propose VARCHAR(150) NOT NULL,
    code_propose VARCHAR(50),
    description TEXT NOT NULL,
    justification TEXT,
    id_categorie UUID
        REFERENCES categorie_equipement(id),
    geom_type VARCHAR(20),
    attributs_suggeres JSONB,
    statut VARCHAR(30) DEFAULT 'en_attente' CHECK (statut IN (
        'en_attente','en_analyse',
        'approuve','rejete'
    )),
    priorite VARCHAR(20) DEFAULT 'normale',
    demande_par UUID REFERENCES utilisateur(id),
    analyse_par UUID REFERENCES utilisateur(id),
    date_demande TIMESTAMP DEFAULT NOW(),
    commentaire_admin TEXT,
    id_type_cree UUID REFERENCES type_equipement(id)
);

-- ============================================
-- MODULE 6 : IMPORT DWG
-- ============================================

CREATE TABLE IF NOT EXISTS import_dwg (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_fichier VARCHAR(255),
    utilisateur_import UUID REFERENCES utilisateur(id),
    date_import TIMESTAMP DEFAULT NOW(),
    systeme_projection VARCHAR(50),
    statut_import VARCHAR(50) DEFAULT 'en_cours' CHECK (
        statut_import IN (
            'en_cours','valide','bloque',
            'erreur','annule'
        )
    ),
    statut_validation VARCHAR(50),
    nb_erreurs INTEGER DEFAULT 0,
    nb_corrigees INTEGER DEFAULT 0,
    log_import TEXT,
    mode_validation VARCHAR(20) DEFAULT 'assiste'
);

CREATE TABLE IF NOT EXISTS rapport_import (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_import UUID REFERENCES import_dwg(id),
    type_erreur VARCHAR(100),
    objet VARCHAR(100),
    description TEXT,
    geom GEOMETRY,
    niveau VARCHAR(20) CHECK (niveau IN (
        'bloquant','warning','info'
    )),
    corrige BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MODULE 7 : SUIVI DES TRAVAUX
-- ============================================

CREATE TABLE IF NOT EXISTS equipe_travaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(150) UNIQUE NOT NULL,
    chef_equipe UUID REFERENCES utilisateur(id),
    specialite VARCHAR(100) CHECK (specialite IN (
        'telecom','gc','energie','mixte'
    )),
    nb_membres INTEGER DEFAULT 1,
    actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS seq_ot START 1;

CREATE TABLE IF NOT EXISTS ordre_travail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_ot VARCHAR(50) UNIQUE NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    type_travaux VARCHAR(100) CHECK (type_travaux IN (
        'pose_cable','pose_fourreau',
        'installation_noeud','installation_equipement',
        'maintenance','reparation',
        'raccordement_client','audit_reseau','autre'
    )),
    priorite VARCHAR(20) DEFAULT 'normale' CHECK (priorite IN (
        'basse','normale','haute','urgente','critique'
    )),
    date_debut_prevue DATE NOT NULL,
    date_fin_prevue DATE NOT NULL,
    date_debut_reelle DATE,
    date_fin_reelle DATE,
    statut VARCHAR(50) DEFAULT 'planifie' CHECK (statut IN (
        'planifie','en_attente_validation','valide',
        'en_cours','suspendu','termine',
        'receptione','cloture','annule'
    )),
    avancement_pct INTEGER DEFAULT 0
        CHECK (avancement_pct BETWEEN 0 AND 100),
    geom_point GEOMETRY(POINT, 4326),
    adresse_chantier TEXT,
    id_equipe UUID REFERENCES equipe_travaux(id),
    id_responsable UUID REFERENCES utilisateur(id),
    id_noeud_telecom UUID REFERENCES noeud_telecom(id),
    id_noeud_gc UUID REFERENCES noeud_gc(id),
    id_logement UUID REFERENCES logement(id),
    id_equipement UUID REFERENCES equipement(id),
    cout_estime DECIMAL(12,2),
    cout_reel DECIMAL(12,2),
    devise VARCHAR(10) DEFAULT 'XOF',
    commentaire TEXT,
    cree_par UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ot_statut ON ordre_travail(statut);
CREATE INDEX IF NOT EXISTS idx_ot_geom
    ON ordre_travail USING GIST(geom_point);

CREATE TABLE IF NOT EXISTS tache_travail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ot UUID
        REFERENCES ordre_travail(id) ON DELETE CASCADE,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    ordre INTEGER DEFAULT 0,
    statut VARCHAR(30) DEFAULT 'a_faire' CHECK (statut IN (
        'a_faire','en_cours','bloquee',
        'terminee','annulee'
    )),
    avancement_pct INTEGER DEFAULT 0
        CHECK (avancement_pct BETWEEN 0 AND 100),
    assignee_a UUID REFERENCES utilisateur(id),
    date_debut DATE,
    date_fin DATE,
    id_tache_precedente UUID REFERENCES tache_travail(id),
    date_creation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rapport_journalier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ot UUID REFERENCES ordre_travail(id),
    date_rapport DATE NOT NULL,
    avancement_jour_pct INTEGER
        CHECK (avancement_jour_pct BETWEEN 0 AND 100),
    travaux_realises TEXT NOT NULL,
    travaux_prevus_demain TEXT,
    problemes_rencontres TEXT,
    meteo VARCHAR(50),
    nb_ouvriers INTEGER,
    heures_travaillees DECIMAL(5,2),
    geom GEOMETRY(POINT, 4326),
    photos JSONB DEFAULT '[]',
    redige_par UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW(),
    UNIQUE(id_ot, date_rapport, redige_par)
);

CREATE TABLE IF NOT EXISTS reception_travaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ot UUID REFERENCES ordre_travail(id) UNIQUE,
    conformite_technique BOOLEAN,
    conformite_securite BOOLEAN,
    note_qualite INTEGER CHECK (note_qualite BETWEEN 1 AND 5),
    reserves TEXT,
    decision VARCHAR(30) CHECK (decision IN (
        'accepte','accepte_avec_reserves','refuse'
    )),
    reseau_mis_a_jour BOOLEAN DEFAULT FALSE,
    receptione_par UUID REFERENCES utilisateur(id),
    date_reception TIMESTAMP DEFAULT NOW(),
    commentaire TEXT
);

CREATE TABLE IF NOT EXISTS alerte_travaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ot UUID REFERENCES ordre_travail(id),
    type_alerte VARCHAR(100),
    message TEXT NOT NULL,
    niveau VARCHAR(20) CHECK (niveau IN (
        'info','warning','critique'
    )),
    lu BOOLEAN DEFAULT FALSE,
    destinataire UUID REFERENCES utilisateur(id),
    date_alerte TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MODULE 8 : ITINÉRAIRES
-- ============================================

CREATE TABLE IF NOT EXISTS itineraire (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(200),
    type_itineraire VARCHAR(50) CHECK (type_itineraire IN (
        'client_raccordement','chemin_optique',
        'maintenance','gc_tranchee','urgence','custom'
    )),
    geom_depart GEOMETRY(POINT, 4326),
    geom_arrivee GEOMETRY(POINT, 4326),
    geom_trace GEOMETRY(LINESTRING, 4326),
    longueur_totale_m FLOAT,
    nb_splices INTEGER DEFAULT 0,
    attenuation_totale_db FLOAT,
    marge_optique_db FLOAT,
    qualite_signal VARCHAR(20) CHECK (qualite_signal IN (
        'excellent','bon','acceptable',
        'faible','hors_limite'
    )),
    algorithme VARCHAR(50) DEFAULT 'dijkstra',
    points_etape JSONB DEFAULT '[]',
    statut VARCHAR(30) DEFAULT 'calcule',
    id_ot UUID REFERENCES ordre_travail(id),
    calcule_par UUID REFERENCES utilisateur(id),
    date_calcul TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_itineraire_trace
    ON itineraire USING GIST(geom_trace);

-- ============================================
-- MODULE 9 : BON DE COMMANDE ÉLIGIBILITÉ
-- ============================================

CREATE TABLE IF NOT EXISTS bon_commande (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    adresse TEXT NOT NULL,
    commune VARCHAR(150),
    offre VARCHAR(100),
    id_pbo UUID REFERENCES noeud_telecom(id),
    niveau_eligibilite VARCHAR(30),
    statut VARCHAR(30) DEFAULT 'en_attente' CHECK (statut IN (
        'en_attente','contacte','converti',
        'perdu','annule'
    )),
    commercial_assigne UUID REFERENCES utilisateur(id),
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_contact TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bon_commande_statut
    ON bon_commande(statut);

-- ============================================
-- MODULE 9B : ZONES D'INFLUENCE
-- ============================================

CREATE TABLE IF NOT EXISTS zone_influence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type_zone VARCHAR(50) DEFAULT 'standard' CHECK (type_zone IN (
        'standard','prioritaire','exclusion','gc'
    )),
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    capacite_max INTEGER,
    nb_clients_actifs INTEGER DEFAULT 0,
    statut VARCHAR(30) DEFAULT 'active' CHECK (statut IN (
        'active','inactive','planifiee'
    )),
    responsable UUID REFERENCES utilisateur(id),
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_zone_influence_geom
    ON zone_influence USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_zone_influence_statut
    ON zone_influence(statut);

-- ============================================
-- MODULE 10 : HISTORISATION
-- ============================================

CREATE TABLE IF NOT EXISTS historique_modifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_cible VARCHAR(100),
    id_objet UUID,
    action VARCHAR(20) CHECK (action IN (
        'INSERT','UPDATE','DELETE'
    )),
    utilisateur_id UUID REFERENCES utilisateur(id),
    date_action TIMESTAMP DEFAULT NOW(),
    donnees_avant JSONB,
    donnees_apres JSONB
);
CREATE INDEX IF NOT EXISTS idx_historique_table
    ON historique_modifications(table_cible, id_objet);

-- ============================================
-- MODULE 11 : NOTIFICATIONS EMAIL
-- ============================================

CREATE TABLE IF NOT EXISTS notification_email (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinataire_email VARCHAR(255) NOT NULL,
    destinataire_nom VARCHAR(200),
    type_email VARCHAR(50),
    sujet VARCHAR(255) NOT NULL,
    corps_html TEXT NOT NULL,
    statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
        'en_attente','envoi_en_cours',
        'envoye','echec','annule'
    )),
    nb_tentatives INTEGER DEFAULT 0,
    date_envoi TIMESTAMP,
    date_creation TIMESTAMP DEFAULT NOW()
);


-- ============================================
-- MODULE 12 : PHOTOS ÉQUIPEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS photo_equipement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_noeud UUID REFERENCES noeud_telecom(id) ON DELETE CASCADE,
    id_noeud_gc UUID REFERENCES noeud_gc(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    nom_fichier VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    commentaire TEXT,
    auteur UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_photo_noeud ON photo_equipement(id_noeud);

-- ============================================
-- MODULE 13 : API PUBLIQUE — CLÉS API
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cle VARCHAR(64) UNIQUE NOT NULL,
    nom_client VARCHAR(150) NOT NULL,
    email_contact VARCHAR(255),
    permissions JSONB DEFAULT '["read"]',
    quota_jour INTEGER DEFAULT 1000,
    nb_appels_jour INTEGER DEFAULT 0,
    date_reset_quota DATE DEFAULT CURRENT_DATE,
    actif BOOLEAN DEFAULT TRUE,
    cree_par UUID REFERENCES utilisateur(id),
    date_creation TIMESTAMP DEFAULT NOW(),
    date_derniere_utilisation TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_api_keys_cle ON api_keys(cle);

-- ============================================
-- TRIGGERS
-- ============================================

-- Longueur automatique
CREATE OR REPLACE FUNCTION calc_longueur()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geom IS NOT NULL THEN
        NEW.longueur_m := ST_Length(
            ST_Transform(NEW.geom, 3857)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_longueur_telecom ON
BEFORE INSERT OR UPDATE ON lien_telecom
FOR EACH ROW EXECUTE FUNCTION calc_longueur();

DROP TRIGGER IF EXISTS trg_longueur_gc ON
BEFORE INSERT OR UPDATE ON lien_gc
FOR EACH ROW EXECUTE FUNCTION calc_longueur();

-- Historisation
CREATE OR REPLACE FUNCTION log_modification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO historique_modifications
        (table_cible, id_objet, action,
         donnees_avant, donnees_apres)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT'
             THEN row_to_json(OLD)::jsonb END,
        CASE WHEN TG_OP != 'DELETE'
             THEN row_to_json(NEW)::jsonb END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hist_noeud_telecom ON
AFTER INSERT OR UPDATE OR DELETE ON noeud_telecom
FOR EACH ROW EXECUTE FUNCTION log_modification();

DROP TRIGGER IF EXISTS trg_hist_lien_telecom ON
AFTER INSERT OR UPDATE OR DELETE ON lien_telecom
FOR EACH ROW EXECUTE FUNCTION log_modification();

DROP TRIGGER IF EXISTS trg_hist_noeud_gc ON
AFTER INSERT OR UPDATE OR DELETE ON noeud_gc
FOR EACH ROW EXECUTE FUNCTION log_modification();

DROP TRIGGER IF EXISTS trg_hist_lien_gc ON
AFTER INSERT OR UPDATE OR DELETE ON lien_gc
FOR EACH ROW EXECUTE FUNCTION log_modification();

DROP TRIGGER IF EXISTS trg_hist_logement ON
AFTER INSERT OR UPDATE OR DELETE ON logement
FOR EACH ROW EXECUTE FUNCTION log_modification();

DROP TRIGGER IF EXISTS trg_hist_ot ON
AFTER INSERT OR UPDATE OR DELETE ON ordre_travail
FOR EACH ROW EXECUTE FUNCTION log_modification();

-- Avancement OT
CREATE OR REPLACE FUNCTION maj_avancement_ot()
RETURNS TRIGGER AS $$
DECLARE v_avg INTEGER;
BEGIN
    SELECT COALESCE(AVG(avancement_pct),0)::INTEGER
    INTO v_avg
    FROM tache_travail
    WHERE id_ot = NEW.id_ot
    AND statut != 'annulee';

    UPDATE ordre_travail
    SET avancement_pct = v_avg,
        date_modification = NOW()
    WHERE id = NEW.id_ot;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_avancement_ot ON
AFTER INSERT OR UPDATE ON tache_travail
FOR EACH ROW EXECUTE FUNCTION maj_avancement_ot();

-- Verrouillage compte
CREATE OR REPLACE FUNCTION check_verrouillage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.succes = FALSE
       AND NEW.id_utilisateur IS NOT NULL THEN
        UPDATE utilisateur
        SET nb_tentatives_echec = nb_tentatives_echec + 1
        WHERE id = NEW.id_utilisateur;

        UPDATE utilisateur
        SET compte_verrouille = TRUE,
            date_verrouillage = NOW()
        WHERE id = NEW.id_utilisateur
        AND nb_tentatives_echec >= 5;
    END IF;

    IF NEW.succes = TRUE
       AND NEW.id_utilisateur IS NOT NULL THEN
        UPDATE utilisateur
        SET nb_tentatives_echec = 0,
            date_derniere_connexion = NOW()
        WHERE id = NEW.id_utilisateur;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verrouillage ON
AFTER INSERT ON journal_connexion
FOR EACH ROW EXECUTE FUNCTION check_verrouillage();

-- Numérotation OT automatique
CREATE OR REPLACE FUNCTION generer_numero_ot()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_ot := 'OT-' ||
        TO_CHAR(NOW(),'YYYY') || '-' ||
        LPAD(nextval('seq_ot')::TEXT,5,'0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_ot ON
BEFORE INSERT ON ordre_travail
FOR EACH ROW EXECUTE FUNCTION generer_numero_ot();

-- ============================================
-- VUE DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW kpi_dashboard AS
SELECT
    (SELECT COUNT(*) FROM logement) AS total_logements,
    (SELECT COALESCE(SUM(nb_el_reel),0)
     FROM logement) AS total_el,
    (SELECT COALESCE(SUM(nb_el_raccordables),0)
     FROM logement) AS el_raccordables,
    (SELECT COALESCE(SUM(nb_el_raccordes),0)
     FROM logement) AS el_raccordes,
    (SELECT COUNT(*) FROM noeud_telecom) AS nb_noeuds_telecom,
    (SELECT COUNT(*) FROM noeud_gc) AS nb_noeuds_gc,
    (SELECT COUNT(*) FROM lien_telecom) AS nb_liens_telecom,
    (SELECT COUNT(*) FROM lien_gc) AS nb_liens_gc,
    (SELECT COUNT(*) FROM ordre_travail
     WHERE statut = 'en_cours') AS ot_en_cours,
    (SELECT COUNT(*) FROM ordre_travail
     WHERE statut NOT IN ('termine','cloture','annule')
     AND date_fin_prevue < CURRENT_DATE) AS ot_en_retard,
    (SELECT COUNT(*) FROM bon_commande
     WHERE statut = 'en_attente') AS bons_commande_attente;
