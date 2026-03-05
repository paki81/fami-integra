-- FAMI INTEGRA - Schema Database (MariaDB)
-- Migration 001: Creazione tabelle principali

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS utenti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    ruolo ENUM('superadmin','admin','tutor','counselor','viewer') NOT NULL DEFAULT 'viewer',
    tenant_id VARCHAR(50) DEFAULT 'default',
    attivo TINYINT(1) DEFAULT 1,
    totp_secret VARCHAR(255),
    totp_abilitato TINYINT(1) DEFAULT 0,
    ultimo_accesso DATETIME,
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Beneficiari
CREATE TABLE IF NOT EXISTS beneficiari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cognome VARCHAR(100) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo_permesso VARCHAR(100),
    nucleo_singolo VARCHAR(100) DEFAULT 'Singolo',
    n_componenti_nucleo INT DEFAULT 1,
    area_intervento VARCHAR(100),
    comune VARCHAR(100),
    note TEXT,
    data_uscita_sai DATE,
    stato ENUM('In Corso','Abbinato Alloggio','Abbinato Lavoro','Abbinato Entrambi','Completato','Annullato') DEFAULT 'In Corso',
    competenze TEXT,
    nazionalita VARCHAR(100),
    livello_italiano VARCHAR(50),
    telefono VARCHAR(50),
    email VARCHAR(255),
    assegnato_a INT,
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assegnato_a) REFERENCES utenti(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Alloggi
CREATE TABLE IF NOT EXISTS alloggi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_alloggio VARCHAR(20) NOT NULL UNIQUE,
    comune VARCHAR(100),
    indirizzo VARCHAR(255),
    tipologia ENUM('Appartamento','Monolocale','Bilocale','Stanza singola','Casa indipendente','Posto letto','Altro') DEFAULT 'Altro',
    n_vani INT DEFAULT 1,
    piano VARCHAR(20),
    canone_mensile DECIMAL(10,2),
    spese_incluse ENUM('S','N','Parziali') DEFAULT 'N',
    proprietario VARCHAR(200),
    agenzia VARCHAR(200),
    telefono_referente VARCHAR(50),
    email_referente VARCHAR(255),
    data_primo_contatto DATE,
    disponibile_da DATE,
    stato ENUM('Disponibile','Occupato','In trattativa','Non disponibile') DEFAULT 'Disponibile',
    note TEXT,
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Aziende
CREATE TABLE IF NOT EXISTS aziende (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_azienda VARCHAR(20) NOT NULL UNIQUE,
    nome_azienda VARCHAR(200) NOT NULL,
    settore VARCHAR(100),
    mansione_profilo TEXT,
    tipo_contratto VARCHAR(100),
    orario ENUM('Full-time','Part-time','Su turni','Altro') DEFAULT 'Full-time',
    indirizzo VARCHAR(255),
    comune VARCHAR(100),
    referente VARCHAR(200),
    telefono VARCHAR(50),
    email VARCHAR(255),
    data_primo_contatto DATE,
    esito_contatto VARCHAR(100),
    disponibile ENUM('S','N') DEFAULT 'S',
    tirocinio ENUM('S','N') DEFAULT 'N',
    note TEXT,
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Matching Alloggi
CREATE TABLE IF NOT EXISTS matching_alloggi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_beneficiario INT NOT NULL,
    id_alloggio INT NOT NULL,
    data_match DATE DEFAULT (CURRENT_DATE),
    composizione_nucleo VARCHAR(100),
    comune_preferenza VARCHAR(100),
    budget_massimo DECIMAL(10,2),
    data_sopralluogo DATE,
    esito_sopralluogo VARCHAR(200),
    contratto_firmato ENUM('S','N') DEFAULT 'N',
    data_inizio_contratto DATE,
    contributo_progetto ENUM('S','N') DEFAULT 'N',
    note TEXT,
    creato_da INT,
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_beneficiario) REFERENCES beneficiari(id) ON DELETE CASCADE,
    FOREIGN KEY (id_alloggio) REFERENCES alloggi(id) ON DELETE CASCADE,
    FOREIGN KEY (creato_da) REFERENCES utenti(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Matching Lavoro
CREATE TABLE IF NOT EXISTS matching_lavoro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_beneficiario INT NOT NULL,
    id_azienda INT NOT NULL,
    data_match DATE DEFAULT (CURRENT_DATE),
    mansione_proposta VARCHAR(200),
    esito VARCHAR(200),
    data_avvio DATE,
    note TEXT,
    creato_da INT,
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_beneficiario) REFERENCES beneficiari(id) ON DELETE CASCADE,
    FOREIGN KEY (id_azienda) REFERENCES aziende(id) ON DELETE CASCADE,
    FOREIGN KEY (creato_da) REFERENCES utenti(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Monitoraggio Contratti
CREATE TABLE IF NOT EXISTS monitoraggio_contratti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_beneficiario INT NOT NULL,
    id_alloggio INT NOT NULL,
    comune VARCHAR(100),
    data_inizio_contratto DATE,
    data_fine_contratto DATE,
    canone_mensile DECIMAL(10,2),
    contributo_progetto_mese DECIMAL(10,2),
    mesi_contributo_previsti INT,
    totale_contributo DECIMAL(10,2) AS (contributo_progetto_mese * mesi_contributo_previsti) STORED,
    pagamenti_effettuati INT DEFAULT 0,
    ultimo_pagamento DATE,
    stato_contratto ENUM('Attivo','Scaduto','Risolto','In rinnovo') DEFAULT 'Attivo',
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_beneficiario) REFERENCES beneficiari(id) ON DELETE CASCADE,
    FOREIGN KEY (id_alloggio) REFERENCES alloggi(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utente_id INT,
    utente_email VARCHAR(255),
    azione VARCHAR(50) NOT NULL,
    tabella VARCHAR(50) NOT NULL,
    record_id INT,
    dati_precedenti JSON,
    dati_nuovi JSON,
    ip_address VARCHAR(45),
    creato_il DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indici
CREATE INDEX idx_beneficiari_comune ON beneficiari(comune);
CREATE INDEX idx_beneficiari_stato ON beneficiari(stato);
CREATE INDEX idx_beneficiari_area ON beneficiari(area_intervento);
CREATE INDEX idx_alloggi_comune ON alloggi(comune);
CREATE INDEX idx_alloggi_stato ON alloggi(stato);
CREATE INDEX idx_aziende_comune ON aziende(comune);
CREATE INDEX idx_aziende_disponibile ON aziende(disponibile);
CREATE INDEX idx_matching_alloggi_ben ON matching_alloggi(id_beneficiario);
CREATE INDEX idx_matching_lavoro_ben ON matching_lavoro(id_beneficiario);
CREATE INDEX idx_audit_log_utente ON audit_log(utente_id);
CREATE INDEX idx_audit_log_tabella ON audit_log(tabella);
