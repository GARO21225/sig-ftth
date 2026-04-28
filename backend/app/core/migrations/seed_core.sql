INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom, role, actif, email_verifie)
VALUES (
    'admin@sig-ftth.ci',
    '$2b$12$pCQT.vGzl9vg/KvUj5zxEO5dOjQTqfIPN5RTcA5HXxrzKiX4SFZLC',
    'KOUAME','Edgar','admin', TRUE, TRUE
) ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash;

INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom, role, actif, email_verifie)
VALUES (
    'commercial@sig-ftth.ci',
    '$2b$12$pCQT.vGzl9vg/KvUj5zxEO5dOjQTqfIPN5RTcA5HXxrzKiX4SFZLC',
    'DIALLO','Aminata','commercial', TRUE, TRUE
) ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash;

INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom, role, actif, email_verifie)
VALUES (
    'technicien@sig-ftth.ci',
    '$2b$12$pCQT.vGzl9vg/KvUj5zxEO5dOjQTqfIPN5RTcA5HXxrzKiX4SFZLC',
    'BAMBA','Seydou','technicien', TRUE, TRUE
) ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash;
