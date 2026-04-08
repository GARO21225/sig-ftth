INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom, role, actif, email_verifie)
VALUES (
    'admin@sig-ftth.ci',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sBGmFBuG2',
    'KOUAME','Edgar','admin', TRUE, TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom, role, actif, email_verifie)
VALUES (
    'commercial@sig-ftth.ci',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sBGmFBuG2',
    'DIALLO','Aminata','commercial', TRUE, TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO utilisateur
    (email, mot_de_passe_hash, nom, prenom, role, actif, email_verifie)
VALUES (
    'technicien@sig-ftth.ci',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sBGmFBuG2',
    'BAMBA','Seydou','technicien', TRUE, TRUE
) ON CONFLICT (email) DO NOTHING;
