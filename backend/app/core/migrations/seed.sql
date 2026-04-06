-- ============================================
-- SIG FTTH v6.1 — DONNÉES INITIALES
-- ============================================

-- Admin par défaut
-- Email : admin@sig-ftth.ci
-- MDP   : Admin@2026!
INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom,
     role, actif, email_verifie)
VALUES (
    'admin@sig-ftth.ci',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sBGmFBuG2',
    'KOUAME','Edgar',
    'admin', TRUE, TRUE
);

-- Commercial de test
INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom,
     role, actif, email_verifie)
VALUES (
    'commercial@sig-ftth.ci',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sBGmFBuG2',
    'DIALLO','Aminata',
    'commercial', TRUE, TRUE
);

-- Technicien de test
INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom,
     role, actif, email_verifie)
VALUES (
    'technicien@sig-ftth.ci',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sBGmFBuG2',
    'BAMBA','Seydou',
    'technicien', TRUE, TRUE
);

-- Catégories équipements
INSERT INTO categorie_equipement
    (nom, icone, couleur, reseau)
VALUES
    ('Télécom','📡','#3B82F6','telecom'),
    ('Génie Civil','🏗️','#F59E0B','gc'),
    ('Énergie','⚡','#10B981','energie'),
    ('Sécurité','🔒','#EF4444','securite');

-- Types équipements standard Télécom
INSERT INTO type_equipement
    (code, nom, geom_type, est_standard,
     statut, icone, couleur, id_categorie)
SELECT v.code, v.nom, 'POINT',
       TRUE, 'valide', v.icone, v.couleur, c.id
FROM categorie_equipement c,
(VALUES
    ('NRO','Nœud Raccordement Optique','🔵','#1D4ED8'),
    ('SRO','Sous-Répartiteur Optique','🟣','#6366F1'),
    ('PBO','Point Branchement Optique','🔷','#8B5CF6'),
    ('PTO','Point Terminaison Optique','◾','#A78BFA'),
    ('PM','Point Mutualisation','🔹','#60A5FA')
) AS v(code,nom,icone,couleur)
WHERE c.nom = 'Télécom';

INSERT INTO type_equipement
    (code, nom, geom_type, est_standard,
     statut, icone, couleur, id_categorie)
SELECT v.code, v.nom, 'LINESTRING',
       TRUE, 'valide', v.icone, v.couleur, c.id
FROM categorie_equipement c,
(VALUES
    ('CAB_OPT','Câble Optique','〰️','#3B82F6')
) AS v(code,nom,icone,couleur)
WHERE c.nom = 'Télécom';

-- Types équipements standard GC
INSERT INTO type_equipement
    (code, nom, geom_type, est_standard,
     statut, icone, couleur, id_categorie)
SELECT v.code, v.nom, 'POINT',
       TRUE, 'valide', v.icone, v.couleur, c.id
FROM categorie_equipement c,
(VALUES
    ('L1T','Chambre L1T','🟡','#F59E0B'),
    ('L2T','Chambre L2T','🟠','#F97316'),
    ('L4T','Chambre L4T','🔴','#EF4444'),
    ('POTEAU','Appui Aérien','🪵','#92400E')
) AS v(code,nom,icone,couleur)
WHERE c.nom = 'Génie Civil';

INSERT INTO type_equipement
    (code, nom, geom_type, est_standard,
     statut, icone, couleur, id_categorie)
SELECT v.code, v.nom, 'LINESTRING',
       TRUE, 'valide', v.icone, v.couleur, c.id
FROM categorie_equipement c,
(VALUES
    ('FOURREAU','Fourreau/Conduite','⚡','#D97706'),
    ('MICRO_TR','Micro-tranchée','〰️','#B45309')
) AS v(code,nom,icone,couleur)
WHERE c.nom = 'Génie Civil';

-- Équipe de travaux de test
INSERT INTO equipe_travaux
    (nom, specialite, nb_membres)
VALUES
    ('Équipe Alpha','telecom',4),
    ('Équipe Beta','gc',3),
    ('Équipe Gamma','mixte',5);
