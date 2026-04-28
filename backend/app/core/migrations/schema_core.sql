CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS utilisateur (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash TEXT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'invite' CHECK (role IN (
        'admin','chef_projet','technicien',
        'analyste','commercial','invite'
    )),
    langue VARCHAR(10) DEFAULT 'fr',
    actif BOOLEAN DEFAULT TRUE,
    email_verifie BOOLEAN DEFAULT FALSE,
    nb_tentatives_echec INTEGER DEFAULT 0,
    compte_verrouille BOOLEAN DEFAULT FALSE,
    date_verrouillage TIMESTAMP,
    date_derniere_connexion TIMESTAMP,
    two_factor_active BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP
);

CREATE TABLE IF NOT EXISTS token_reinitialisation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_utilisateur UUID
        REFERENCES utilisateur(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    type_token VARCHAR(30) CHECK (type_token IN (
        'reset_mdp','verification_email',
        'invitation','two_factor'
    )),
    date_expiration TIMESTAMP NOT NULL,
    utilise BOOLEAN DEFAULT FALSE,
    date_utilisation TIMESTAMP,
    ip_demande VARCHAR(45),
    date_creation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_utilisateur (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_utilisateur UUID
        REFERENCES utilisateur(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    ip_connexion VARCHAR(45),
    user_agent TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_expiration TIMESTAMP NOT NULL,
    date_derniere_activite TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS journal_connexion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_utilisateur UUID REFERENCES utilisateur(id),
    email_tente VARCHAR(255),
    succes BOOLEAN NOT NULL,
    motif_echec VARCHAR(100),
    ip_connexion VARCHAR(45),
    date_tentative TIMESTAMP DEFAULT NOW()
);

-- ============================================
