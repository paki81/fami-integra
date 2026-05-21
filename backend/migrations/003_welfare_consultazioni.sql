-- FAMI INTEGRA - Migration 003
-- Registro Consultazioni Welfare

CREATE TABLE IF NOT EXISTS welfare_consultazioni (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    beneficiario_id   INT NOT NULL,
    operatore_id      INT NOT NULL,
    nome              VARCHAR(100) NOT NULL,
    cognome           VARCHAR(100) NOT NULL,
    codice_fiscale    VARCHAR(20),
    data_consulto     DATE NOT NULL,
    note              TEXT,
    items             LONGTEXT NOT NULL,
    status            ENUM('bozza','finalizzata') NOT NULL DEFAULT 'bozza',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP NULL,
    FOREIGN KEY (beneficiario_id) REFERENCES beneficiari(id) ON DELETE CASCADE,
    FOREIGN KEY (operatore_id) REFERENCES utenti(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_wc_beneficiario ON welfare_consultazioni(beneficiario_id);
CREATE INDEX idx_wc_operatore    ON welfare_consultazioni(operatore_id);
CREATE INDEX idx_wc_data         ON welfare_consultazioni(data_consulto);
CREATE INDEX idx_wc_status       ON welfare_consultazioni(status);
CREATE INDEX idx_wc_deleted      ON welfare_consultazioni(deleted_at);
