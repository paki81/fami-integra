const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/import/beneficiari
router.post('/beneficiari', authenticate, authorize('superadmin', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File mancante' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { range: 3 });

    let imported = 0, errors = [];
    for (const row of data) {
      try {
        const cognome = row['Cognome'] || row['COGNOME'] || '';
        const nome = row['Nome'] || row['NOME'] || '';
        if (!cognome && !nome) continue;

        await pool.query(
          `INSERT INTO beneficiari (cognome, nome, tipo_permesso, nucleo_singolo, n_componenti_nucleo, area_intervento, comune, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cognome, nome,
            row['Tipo Permesso'] || row['TIPO PERMESSO'] || null,
            row['Nucleo/Singolo'] || row['NUCLEO/SINGOLO'] || 'S',
            parseInt(row['N° Componenti Nucleo'] || row['N COMPONENTI NUCLEO'] || 1) || 1,
            row['Area Intervento'] || row['AREA INTERVENTO'] || null,
            row['Comune'] || row['COMUNE'] || null,
            row['Note'] || row['NOTE'] || null
          ]
        );
        imported++;
      } catch (e) {
        errors.push({ row: imported + errors.length + 1, error: e.message });
      }
    }

    await logAudit(req.user, 'IMPORT', 'beneficiari', null, null, { imported, errors: errors.length }, req.ip);
    res.json({ message: `Importati ${imported} beneficiari`, imported, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante import' });
  }
});

// POST /api/import/alloggi
router.post('/alloggi', authenticate, authorize('superadmin', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File mancante' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets['Registro Alloggi'] || wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { range: 2 });

    let imported = 0, errors = [];
    for (const row of data) {
      try {
        const idAlloggio = row['ID Alloggio'] || '';
        if (!idAlloggio) continue;

        const canone = parseFloat(String(row['Canone Mensile (€)'] || row['Canone Mensile'] || 0).replace(/[€,]/g, '')) || null;
        const disponibileDa = row['Disponibile da'] ? excelDateToISO(row['Disponibile da']) : null;
        const dataPrimoContatto = row['Data Primo Contatto'] ? excelDateToISO(row['Data Primo Contatto']) : null;

        // Mappatura tipologia Excel → ENUM DB
        const tipologiaMap = { 'Casa': 'Casa', 'Casa indipendente': 'Casa indipendente', 'Trilocale': 'Trilocale', 'Mansarda ammobiliata': 'Mansarda', 'Mansarda': 'Mansarda', 'Appartamento PT ammobiliato': 'Appartamento', 'Non specificato': 'Altro' };
        const tipRaw = (row['Tipologia'] || 'Altro').trim();
        const tipologia = tipologiaMap[tipRaw] || (['Appartamento','Monolocale','Bilocale','Trilocale','Stanza singola','Casa','Casa indipendente','Mansarda','Posto letto'].includes(tipRaw) ? tipRaw : 'Altro');

        // Mappatura stato Excel → ENUM DB
        const statoRaw = (row['Esito / Stato'] || '').trim();
        const statiValidi = ['Disponibile – da verificare','Contattato – risposta positiva','Contattato – risposta negativa','Occupato','In trattativa','Contratto firmato'];
        const stato = statiValidi.includes(statoRaw) ? statoRaw : 'Disponibile – da verificare';

        await pool.query(
          `INSERT INTO alloggi (id_alloggio, comune, indirizzo, tipologia, n_vani, piano, canone_mensile, spese_incluse, proprietario, telefono_referente, email_referente, data_primo_contatto, disponibile_da, stato, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE comune=VALUES(comune), indirizzo=VALUES(indirizzo), tipologia=VALUES(tipologia), n_vani=VALUES(n_vani), piano=VALUES(piano), canone_mensile=VALUES(canone_mensile), spese_incluse=VALUES(spese_incluse), proprietario=VALUES(proprietario), telefono_referente=VALUES(telefono_referente), email_referente=VALUES(email_referente), data_primo_contatto=VALUES(data_primo_contatto), disponibile_da=VALUES(disponibile_da), stato=VALUES(stato), note=VALUES(note)`,
          [
            idAlloggio,
            row['Comune'] || null,
            row['Indirizzo'] || null,
            tipologia,
            parseInt(row['N° Vani'] || 1) || 1,
            row['Piano'] || null,
            canone,
            row['Spese Incluse?'] || 'N',
            row['Proprietario / Agenzia'] || null,
            row['Telefono Referente'] || null,
            row['Email Referente'] || null,
            dataPrimoContatto,
            disponibileDa,
            stato,
            row['Note'] || null
          ]
        );
        imported++;
      } catch (e) {
        errors.push({ row: imported + errors.length + 1, error: e.message });
      }
    }

    await logAudit(req.user, 'IMPORT', 'alloggi', null, null, { imported, errors: errors.length }, req.ip);
    res.json({ message: `Importati ${imported} alloggi`, imported, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante import' });
  }
});

// POST /api/import/aziende
router.post('/aziende', authenticate, authorize('superadmin', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File mancante' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets['Registro Aziende'] || wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { range: 2 });

    let imported = 0, errors = [];
    for (const row of data) {
      try {
        const idAzienda = row['ID Azienda'] || '';
        const nomeAzienda = row['Nome Azienda'] || '';
        if (!idAzienda || !nomeAzienda) continue;

        await pool.query(
          `INSERT INTO aziende (id_azienda, nome_azienda, settore, mansione_profilo, tipo_contratto, orario, indirizzo, comune, referente, telefono, email, esito_contatto, disponibile, tirocinio, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE nome_azienda=VALUES(nome_azienda), settore=VALUES(settore)`,
          [
            idAzienda, nomeAzienda,
            row['Settore'] || null,
            row['Mansione/Profilo Ricercato'] || null,
            row['Tipo Contratto'] || null,
            normalizeOrario(row['Orario']),
            row['Indirizzo / Comune'] || null,
            extractComune(row['Indirizzo / Comune']),
            row['Referente'] || null,
            row['Telefono'] || null,
            row['Email'] || null,
            row['Esito Contatto'] || null,
            row['Disponibile Tirocinio?'] === 'Sì' ? 'S' : 'N',
            row['Disponibile Tirocinio?'] === 'Sì' ? 'S' : 'N',
            row['Note'] || null
          ]
        );
        imported++;
      } catch (e) {
        errors.push({ row: imported + errors.length + 1, error: e.message });
      }
    }

    await logAudit(req.user, 'IMPORT', 'aziende', null, null, { imported, errors: errors.length }, req.ip);
    res.json({ message: `Importate ${imported} aziende`, imported, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante import' });
  }
});

// GET /api/import/export/:tabella
router.get('/export/:tabella', authenticate, async (req, res) => {
  try {
    const allowedTables = ['beneficiari', 'alloggi', 'aziende', 'matching_alloggi', 'matching_lavoro'];
    const tabella = req.params.tabella;
    if (!allowedTables.includes(tabella)) return res.status(400).json({ error: 'Tabella non valida' });

    const [rows] = await pool.query(`SELECT * FROM ${tabella}`);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tabella);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${tabella}_export.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore export' });
  }
});

// GET /api/import/export-csv/:tabella
router.get('/export-csv/:tabella', authenticate, async (req, res) => {
  try {
    const allowedTables = ['beneficiari', 'alloggi', 'aziende', 'matching_alloggi', 'matching_lavoro'];
    const tabella = req.params.tabella;
    if (!allowedTables.includes(tabella)) return res.status(400).json({ error: 'Tabella non valida' });

    const [rows] = await pool.query(`SELECT * FROM ${tabella}`);
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);

    res.setHeader('Content-Disposition', `attachment; filename="${tabella}_export.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore export' });
  }
});

function excelDateToISO(val) {
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return val || null;
}

function normalizeOrario(val) {
  if (!val) return 'Full-time';
  const v = val.toLowerCase();
  if (v.includes('full')) return 'Full-time';
  if (v.includes('part')) return 'Part-time';
  if (v.includes('turni')) return 'Su turni';
  return 'Altro';
}

function extractComune(address) {
  if (!address) return null;
  const parts = address.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : address.trim().toUpperCase();
}

module.exports = router;
