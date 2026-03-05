-- FAMI INTEGRA - Seed Data
-- Migration 002: Dati di esempio basati sui file Excel

-- Password: admin123 (bcrypt hash)
INSERT INTO utenti (nome, cognome, email, password_hash, ruolo, tenant_id) VALUES
('Admin', 'Sistema', 'admin@fami-integra.it', '$2b$10$YPya4AWnT9sgCyHa7JILTuJkVg4o6IoTI7EwmCWew.t8Kp3O8bRxa', 'superadmin', 'default'),
('Maria', 'Rossi', 'tutor.casa@fami-integra.it', '$2b$10$YPya4AWnT9sgCyHa7JILTuJkVg4o6IoTI7EwmCWew.t8Kp3O8bRxa', 'tutor', 'default'),
('Luca', 'Bianchi', 'counselor.lavoro@fami-integra.it', '$2b$10$YPya4AWnT9sgCyHa7JILTuJkVg4o6IoTI7EwmCWew.t8Kp3O8bRxa', 'counselor', 'default'),
('Sara', 'Verdi', 'viewer@fami-integra.it', '$2b$10$YPya4AWnT9sgCyHa7JILTuJkVg4o6IoTI7EwmCWew.t8Kp3O8bRxa', 'viewer', 'default');

-- Beneficiari (basati su FAMI_POTENZIALI_BENEFICIARI.xlsx)
INSERT INTO beneficiari (cognome, nome, tipo_permesso, nucleo_singolo, n_componenti_nucleo, area_intervento, comune, note, data_uscita_sai, stato, competenze, nazionalita, livello_italiano) VALUES
('SLOBODIAN', 'OLEH', 'PROTEZIONE TEMPORANEA', 'NUCLEO', 7, 'LAVORATIVO', 'SANT''AGATA DI P.', 'SONO IN USCITA IL 5/03/2026 HANNO TROVATO CASA A SANT''AGATA CON CONTRATTO. NON HA UN LAVORO', '2026-03-05', 'In Corso', 'Operaio generico, edilizia', 'Ucraina', 'A2'),
('AHMED', 'HASSAN', 'PROTEZIONE SUSSIDIARIA', 'SINGOLO', 1, 'LAVORATIVO-ALLOGGIO', 'CASERTA', 'In uscita da SAI, cerca alloggio e lavoro', '2026-04-01', 'In Corso', 'Ristorazione, cucina', 'Somalia', 'B1'),
('DIALLO', 'MAMADOU', 'PROTEZIONE SPECIALE', 'SINGOLO', 1, 'ALLOGGIO', 'NAPOLI', 'Ha già un lavoro part-time, cerca solo alloggio', '2026-03-15', 'In Corso', 'Magazziniere', 'Guinea', 'A2'),
('KHAN', 'FATIMA', 'PROTEZIONE TEMPORANEA', 'NUCLEO', 4, 'LAVORATIVO-ALLOGGIO', 'CASERTA', 'Nucleo con 2 minori, marito disoccupato', '2026-05-01', 'In Corso', 'Sartoria, pulizie', 'Afghanistan', 'A1'),
('SANTOS', 'MARIA', 'PROTEZIONE SUSSIDIARIA', 'NUCLEO', 3, 'LAVORATIVO-ALLOGGIO', 'AVERSA', 'Madre con 2 figli, cerca lavoro e alloggio', '2026-03-20', 'In Corso', 'Cameriera, pulizie', 'Nigeria', 'B1'),
('PETROV', 'IVAN', 'PROTEZIONE TEMPORANEA', 'NUCLEO', 2, 'ALLOGGIO', 'SANT''AGATA DI P.', 'Coppia, lui lavora già come operaio', '2026-04-15', 'In Corso', 'Operaio, saldatore', 'Ucraina', 'A2'),
('YUSUF', 'ALI', 'PROTEZIONE SPECIALE', 'SINGOLO', 1, 'LAVORATIVO', 'CASERTA', 'Cerca solo lavoro, ha già alloggio tramite amici', '2026-03-10', 'Abbinato Alloggio', 'Ristorazione, cucina', 'Somalia', 'B1'),
('NDONGO', 'PAUL', 'PROTEZIONE SUSSIDIARIA', 'SINGOLO', 1, 'LAVORATIVO-ALLOGGIO', 'NAPOLI', 'Nessuna esperienza lavorativa documentata', '2026-06-01', 'In Corso', NULL, 'Camerun', 'Pre-A1'),
('POPOVA', 'ANNA', 'PROTEZIONE TEMPORANEA', 'NUCLEO', 5, 'LAVORATIVO-ALLOGGIO', 'CASERTA', 'Nucleo con 3 minori, necessita alloggio grande', '2026-04-20', 'In Corso', 'Insegnante, baby-sitter', 'Ucraina', 'B2'),
('TOURE', 'IBRAHIMA', 'PROTEZIONE SPECIALE', 'SINGOLO', 1, 'LAVORATIVO', 'AVERSA', 'Ha patente B, disponibile a spostamenti', '2026-03-25', 'In Corso', 'Autista, logistica', 'Mali', 'A2');

-- Alloggi (basati su Registro Alloggi FAMI WP3.xlsx)
INSERT INTO alloggi (id_alloggio, comune, indirizzo, tipologia, n_vani, piano, canone_mensile, spese_incluse, proprietario, telefono_referente, email_referente, disponibile_da, stato, note) VALUES
('ALG01', 'CASERTA', 'Via Roma 15', 'Bilocale', 3, '2°', 400.00, 'N', 'Rossi Mario', '333-1234567', 'rossi@email.it', '2026-03-01', 'Disponibile', 'Buone condizioni, vicino stazione'),
('ALG02', 'CASERTA', 'Via Vico 8', 'Monolocale', 2, '1°', 300.00, 'S', 'Bianchi Luigi', '333-2345678', 'bianchi@email.it', '2026-03-15', 'Disponibile', 'Arredato, spese incluse'),
('ALG03', 'NAPOLI', 'Via Toledo 120', 'Appartamento', 4, '3°', 550.00, 'Parziali', 'Immobiliare Sud', '081-5551234', 'info@immobiliaresud.it', '2026-04-01', 'Disponibile', '4 vani, ideale famiglie'),
('ALG04', 'SANT''AGATA DI P.', 'Corso Vittorio 45', 'Appartamento', 5, '1°', 450.00, 'N', 'De Luca Anna', '333-3456789', 'deluca@email.it', '2026-03-01', 'Disponibile', 'Grande, 5 vani, giardino condominiale'),
('ALG05', 'AVERSA', 'Via Seggio 22', 'Bilocale', 3, '2°', 380.00, 'N', 'Esposito Gennaro', '333-4567890', 'esposito@email.it', '2026-03-10', 'Disponibile', 'Ristrutturato di recente'),
('ALG06', 'CASERTA', 'Via San Carlo 5', 'Stanza singola', 1, 'T', 200.00, 'S', 'Ferraro Paola', '333-5678901', 'ferraro@email.it', '2026-03-01', 'Disponibile', 'Stanza in appartamento condiviso'),
('ALG07', 'NAPOLI', 'Via Tribunali 88', 'Monolocale', 2, '4°', 350.00, 'N', 'Greco Salvatore', '333-6789012', 'greco@email.it', '2026-04-15', 'In trattativa', 'Centro storico, senza ascensore'),
('ALG08', 'CASERTA', 'Via Acquaviva 30', 'Appartamento', 4, '2°', 480.00, 'Parziali', 'Martino Giuseppe', '333-7890123', 'martino@email.it', '2026-05-01', 'Disponibile', 'Luminoso, 4 vani, posto auto'),
('ALG09', 'SANT''AGATA DI P.', 'Via Napoli 12', 'Bilocale', 2, '1°', 320.00, 'N', 'Conte Rosa', '333-8901234', 'conte@email.it', '2026-03-20', 'Disponibile', 'Piano terra, accessibile'),
('ALG10', 'AVERSA', 'Via Roma 67', 'Casa indipendente', 6, 'T', 600.00, 'N', 'Agenzia Immobiliare Centro', '081-5559999', 'centro@agenzia.it', '2026-04-01', 'Disponibile', 'Indipendente con giardino, ideale nucleo grande');

-- Aziende (basati su Registro Aziende FAMI WP4.xlsx)
INSERT INTO aziende (id_azienda, nome_azienda, settore, mansione_profilo, tipo_contratto, orario, indirizzo, comune, referente, telefono, email, disponibile, tirocinio, note) VALUES
('AZ001', 'Ristorante Da Giovanni', 'Ristorazione', 'Aiuto cuoco / Lavapiatti', 'Tirocinio', 'Full-time', 'Via Mazzini 10, Caserta', 'CASERTA', 'Giovanni Russo', '333-1111111', 'giovanni@ristorantedagiovanni.it', 'S', 'S', 'Disponibile da subito per tirocinio 6 mesi'),
('AZ002', 'Cooperativa Agricola Verde', 'Agricoltura', 'Operaio agricolo', 'Tempo determinato', 'Full-time', 'SP 265, Aversa', 'AVERSA', 'Franco Miele', '333-2222222', 'info@coopverde.it', 'S', 'S', 'Lavoro stagionale, possibilità rinnovo'),
('AZ003', 'Edil Casa Srl', 'Edilizia', 'Manovale / Operaio edile', 'Tempo determinato', 'Full-time', 'Via Appia 200, Caserta', 'CASERTA', 'Antonio Gallo', '333-3333333', 'info@edilcasa.it', 'S', 'N', 'Richiesta esperienza base in edilizia'),
('AZ004', 'Clean Service Srl', 'Pulizie', 'Addetto/a pulizie', 'Part-time', 'Part-time', 'Via Tasso 5, Napoli', 'NAPOLI', 'Maria Esposito', '333-4444444', 'hr@cleanservice.it', 'S', 'S', 'Part-time mattina, anche senza esperienza'),
('AZ005', 'Logistica Campana SpA', 'Logistica', 'Magazziniere / Carrellista', 'Tempo determinato', 'Full-time', 'Interporto, Marcianise', 'CASERTA', 'Paolo Izzo', '333-5555555', 'lavoro@logicampana.it', 'S', 'N', 'Richiesta patente B e uso carrello elevatore'),
('AZ006', 'Hotel Vanvitelli', 'Ristorazione', 'Cameriere sala / Facchino', 'Tirocinio', 'Su turni', 'Viale Carlo III, Caserta', 'CASERTA', 'Laura Capone', '333-6666666', 'hr@hotelvanvitelli.it', 'S', 'S', 'Turni, weekend inclusi'),
('AZ007', 'Sartoria Moderna', 'Commercio', 'Sarto/a - Addetto/a confezioni', 'Tirocinio', 'Part-time', 'Via Duomo 33, Aversa', 'AVERSA', 'Lucia Romano', '333-7777777', 'info@sartoriamoderna.it', 'S', 'S', 'Ideale per chi ha esperienza sartoriale'),
('AZ008', 'SuperMarket Più', 'Commercio', 'Scaffalista / Cassiere', 'Tempo determinato', 'Part-time', 'Via Nazionale 100, Caserta', 'CASERTA', 'Marco Vitale', '333-8888888', 'lavoro@supermarketpiu.it', 'N', 'N', 'Al momento non disponibile'),
('AZ009', 'Trasporti Vesuvio Srl', 'Logistica', 'Autista consegne', 'Tempo determinato', 'Full-time', 'Via Argine 50, Napoli', 'NAPOLI', 'Salvatore Pinto', '333-9999999', 'info@trasportivesuvio.it', 'S', 'N', 'Richiesta patente B, italiano base'),
('AZ010', 'Baby Park Ludoteca', 'Altro', 'Educatrice / Assistente infanzia', 'Part-time', 'Part-time', 'Via Libertà 15, Caserta', 'CASERTA', 'Chiara Nobile', '333-0000000', 'info@babypark.it', 'S', 'S', 'Part-time pomeriggio, richiesto B1 italiano');
