const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { geocodeAddress } = require('../utils/geocoder');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: carica ente con servizi
async function loadEnte(id) {
  const [enti] = await pool.query('SELECT e.*, u.nome AS creato_da_nome, u.cognome AS creato_da_cognome FROM enti_welfare e LEFT JOIN utenti u ON e.creato_da = u.id WHERE e.id = ?', [id]);
  if (!enti.length) return null;
  const [servizi] = await pool.query('SELECT * FROM servizi_welfare WHERE ente_id = ? ORDER BY categoria ASC', [id]);
  return { ...enti[0], servizi };
}

// GET / - Lista enti con servizi
router.get('/', authenticate, async (req, res) => {
  try {
    const { comune, search, page = 1, limit = 50, sort = 'nome_ente', order = 'ASC' } = req.query;
    const allowedSort = ['nome_ente', 'comune_erogatore', 'creato_il'];
    const sortCol = allowedSort.includes(sort) ? sort : 'nome_ente';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    let where = ['1=1'], params = [];
    if (comune) { where.push('e.comune_erogatore LIKE ?'); params.push(`%${comune}%`); }
    if (search) { where.push('(e.nome_ente LIKE ? OR e.comune_erogatore LIKE ? OR e.contatto LIKE ? OR e.id IN (SELECT ente_id FROM servizi_welfare WHERE categoria LIKE ? OR descrizione LIKE ?))'); params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM enti_welfare e WHERE ${where.join(' AND ')}`, params);
    const [rows] = await pool.query(
      `SELECT e.*, u.nome AS creato_da_nome, u.cognome AS creato_da_cognome FROM enti_welfare e LEFT JOIN utenti u ON e.creato_da = u.id WHERE ${where.join(' AND ')} ORDER BY e.${sortCol} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    // Attach servizi per ogni ente
    for (const ente of rows) {
      const [servizi] = await pool.query('SELECT * FROM servizi_welfare WHERE ente_id = ? ORDER BY categoria', [ente.id]);
      ente.servizi = servizi;
    }
    res.json({ data: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Errore server' }); }
});

// GET /categorie
router.get('/categorie', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT categoria FROM servizi_welfare WHERE categoria IS NOT NULL AND categoria != "" ORDER BY categoria');
    res.json(rows.map(r => r.categoria));
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// GET /comuni - Lista comuni con conteggi enti (supporta search per ente/servizio/categoria)
router.get('/comuni', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    let where = ["e.comune_erogatore IS NOT NULL AND e.comune_erogatore != ''"];
    let params = [];
    if (search) {
      where.push('(e.comune_erogatore LIKE ? OR e.nome_ente LIKE ? OR e.contatto LIKE ? OR e.id IN (SELECT ente_id FROM servizi_welfare WHERE categoria LIKE ? OR descrizione LIKE ?))');
      params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`);
    }
    const [rows] = await pool.query(
      `SELECT e.comune_erogatore, COUNT(*) as n_enti, SUM(CASE WHEN e.attivo=1 THEN 1 ELSE 0 END) as n_attivi
       FROM enti_welfare e WHERE ${where.join(' AND ')}
       GROUP BY e.comune_erogatore ORDER BY e.comune_erogatore`, params
    );
    for (const r of rows) {
      const [s] = await pool.query(
        `SELECT COUNT(*) as n FROM servizi_welfare sw JOIN enti_welfare e ON sw.ente_id=e.id WHERE e.comune_erogatore=?`, [r.comune_erogatore]
      );
      r.n_servizi = s[0].n;
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// GET /per-comune/:comune - Enti di un comune con servizi
router.get('/per-comune/:comune', authenticate, async (req, res) => {
  try {
    const { search, categoria } = req.query;
    let where = ['e.comune_erogatore = ?'], params = [req.params.comune];
    if (search) { where.push('(e.nome_ente LIKE ? OR e.contatto LIKE ? OR e.id IN (SELECT ente_id FROM servizi_welfare WHERE categoria LIKE ? OR descrizione LIKE ?))'); params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
    if (categoria) { where.push('e.id IN (SELECT ente_id FROM servizi_welfare WHERE categoria = ?)'); params.push(categoria); }
    const [rows] = await pool.query(
      `SELECT e.*, u.nome AS creato_da_nome, u.cognome AS creato_da_cognome FROM enti_welfare e LEFT JOIN utenti u ON e.creato_da = u.id WHERE ${where.join(' AND ')} ORDER BY e.nome_ente`,
      params
    );
    for (const ente of rows) {
      const [servizi] = await pool.query('SELECT * FROM servizi_welfare WHERE ente_id = ? ORDER BY categoria', [ente.id]);
      ente.servizi = servizi;
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Errore server' }); }
});

// GET /mappa
router.get('/mappa', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.nome_ente, e.comune_erogatore, e.indirizzo_sede, e.contatto, e.latitudine, e.longitudine
       FROM enti_welfare e WHERE e.latitudine IS NOT NULL AND e.longitudine IS NOT NULL AND e.attivo=1`
    );
    for (const r of rows) {
      const [s] = await pool.query('SELECT categoria FROM servizi_welfare WHERE ente_id=?', [r.id]);
      r.categorie = s.map(x => x.categoria);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// GET /:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ente = await loadEnte(req.params.id);
    if (!ente) return res.status(404).json({ error: 'Ente non trovato' });
    res.json(ente);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST / - Crea ente con servizi
router.post('/', authenticate, authorize('superadmin','admin','tutor','counselor'), [
  body('nome_ente').notEmpty().withMessage('Il nome ente è obbligatorio'),
  body('servizi').isArray({ min: 1 }).withMessage('Seleziona almeno un servizio'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { nome_ente, comune_erogatore, indirizzo_sede, contatto, orario_giorno, in_loco, target_utenza, note_accesso, attivo, servizi } = req.body;
    const [result] = await pool.query(
      `INSERT INTO enti_welfare (nome_ente, comune_erogatore, indirizzo_sede, contatto, orario_giorno, in_loco, target_utenza, note_accesso, attivo, creato_da) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [nome_ente, comune_erogatore||null, indirizzo_sede||null, contatto||null, orario_giorno||null, in_loco||'Da verificare', target_utenza||null, note_accesso||null, attivo!==undefined?attivo:1, req.user.id]
    );
    const enteId = result.insertId;
    // Inserisci servizi
    for (const s of servizi) {
      await pool.query('INSERT INTO servizi_welfare (ente_id, categoria, descrizione, attivo) VALUES (?,?,?,?)',
        [enteId, s.categoria, s.descrizione||null, s.attivo!==undefined?s.attivo:1]);
    }
    // Geocodifica background
    if (comune_erogatore) {
      geocodeAddress(indirizzo_sede||'', comune_erogatore).then(geo => {
        if (geo) pool.query('UPDATE enti_welfare SET latitudine=?, longitudine=? WHERE id=?', [geo.lat, geo.lng, enteId]);
      }).catch(()=>{});
    }
    const ente = await loadEnte(enteId);
    await logAudit(req.user, 'CREATE', 'enti_welfare', enteId, null, ente, req.ip);
    res.status(201).json(ente);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Errore server' }); }
});

// PUT /:id - Aggiorna ente e servizi
router.put('/:id', authenticate, authorize('superadmin','admin','tutor','counselor'), async (req, res) => {
  try {
    const old = await loadEnte(req.params.id);
    if (!old) return res.status(404).json({ error: 'Ente non trovato' });
    const fields = ['nome_ente','comune_erogatore','indirizzo_sede','contatto','orario_giorno','in_loco','target_utenza','note_accesso','attivo'];
    const updates = [], values = [];
    fields.forEach(f => { if (req.body[f]!==undefined) { updates.push(`${f}=?`); values.push(req.body[f]===''?null:req.body[f]); }});
    if (updates.length) { values.push(req.params.id); await pool.query(`UPDATE enti_welfare SET ${updates.join(',')} WHERE id=?`, values); }
    // Aggiorna servizi se forniti
    if (req.body.servizi && Array.isArray(req.body.servizi)) {
      await pool.query('DELETE FROM servizi_welfare WHERE ente_id=?', [req.params.id]);
      for (const s of req.body.servizi) {
        await pool.query('INSERT INTO servizi_welfare (ente_id, categoria, descrizione, attivo) VALUES (?,?,?,?)',
          [req.params.id, s.categoria, s.descrizione||null, s.attivo!==undefined?s.attivo:1]);
      }
    }
    // Ri-geocodifica
    const newInd = req.body.indirizzo_sede!==undefined ? req.body.indirizzo_sede : old.indirizzo_sede;
    const newCom = req.body.comune_erogatore!==undefined ? req.body.comune_erogatore : old.comune_erogatore;
    if (req.body.indirizzo_sede!==undefined || req.body.comune_erogatore!==undefined) {
      if (newCom) geocodeAddress(newInd||'', newCom).then(g => { if(g) pool.query('UPDATE enti_welfare SET latitudine=?,longitudine=? WHERE id=?',[g.lat,g.lng,req.params.id]); }).catch(()=>{});
    }
    const updated = await loadEnte(req.params.id);
    await logAudit(req.user, 'UPDATE', 'enti_welfare', req.params.id, old, updated, req.ip);
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Errore server' }); }
});

// DELETE /:id
router.delete('/:id', authenticate, authorize('superadmin','admin'), async (req, res) => {
  try {
    const old = await loadEnte(req.params.id);
    if (!old) return res.status(404).json({ error: 'Ente non trovato' });
    await pool.query('DELETE FROM enti_welfare WHERE id=?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'enti_welfare', req.params.id, old, null, req.ip);
    res.json({ message: 'Ente e servizi eliminati' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /importa - Importa enti e servizi da file Excel multi-foglio
const CATEGORIE_VALIDE = ['Sanitario','Psicologico','Socio-assist.','Antiviolenza','Istruzione / Lingua','Supporto Legale','Mediazione','Supporto Amm.vo','Associazioni Religiose','Associazioni Culturali','Associazioni Sportive','Altro'];

function normalizzaCategoria(val) {
  if (!val) return null;
  const v = val.toString().trim();
  // Match esatto (case-insensitive)
  const found = CATEGORIE_VALIDE.find(c => c.toLowerCase() === v.toLowerCase());
  if (found) return found;
  // Match parziale
  const vl = v.toLowerCase();
  if (vl.includes('sanitar')) return 'Sanitario';
  if (vl.includes('psicolog')) return 'Psicologico';
  if (vl.includes('socio') || vl.includes('assist')) return 'Socio-assist.';
  if (vl.includes('antiviolenz')) return 'Antiviolenza';
  if (vl.includes('istruzion') || vl.includes('lingua')) return 'Istruzione / Lingua';
  if (vl.includes('legale')) return 'Supporto Legale';
  if (vl.includes('mediazion')) return 'Mediazione';
  if (vl.includes('amm')) return 'Supporto Amm.vo';
  if (vl.includes('religio')) return 'Associazioni Religiose';
  if (vl.includes('cultur') || vl.includes('ricreat')) return 'Associazioni Culturali';
  if (vl.includes('sport')) return 'Associazioni Sportive';
  if (vl.includes('volontar')) return 'Associazioni Culturali';
  return v; // Ritorna il valore originale se non riconosciuto
}

function normalizzaInLoco(val) {
  if (!val) return 'Da verificare';
  const v = val.toString().trim().toLowerCase();
  if (v === 'si' || v === 'sì') return 'Si';
  if (v === 'no' || v === 'no*') return 'No';
  if (v.includes('parz')) return 'Parz.';
  return 'Da verificare';
}

router.post('/importa', authenticate, authorize('superadmin','admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File mancante' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const modalita = req.body.modalita || 'aggiungi'; // 'aggiungi' o 'sostituisci'

    if (modalita === 'sostituisci') {
      await pool.query('DELETE FROM servizi_welfare');
      await pool.query('DELETE FROM enti_welfare');
    }

    let totEnti = 0, totServizi = 0, errori = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Trova la riga header (contiene "Categoria")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        if (data[i] && data[i][0] && String(data[i][0]).toLowerCase().includes('categoria')) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        errori.push(`Foglio "${sheetName}": header non trovato, saltato`);
        continue;
      }

      const headers = data[headerIdx].map(h => h ? String(h).trim() : '');

      // Mappa colonne
      const colMap = {};
      headers.forEach((h, idx) => {
        const hl = h.toLowerCase();
        if (hl.includes('categoria')) colMap.categoria = idx;
        else if (hl.includes('servizio') || hl.includes('ente')) colMap.nome_ente = idx;
        else if (hl.includes('comune')) colMap.comune_erogatore = idx;
        else if (hl.includes('contatto')) colMap.contatto = idx;
        else if (hl.includes('orario') || hl.includes('giorno')) colMap.orario_giorno = idx;
        else if (hl.includes('loco')) colMap.in_loco = idx;
        else if (hl.includes('target')) colMap.target_utenza = idx;
        else if (hl.includes('note') || hl.includes('accesso')) colMap.note_accesso = idx;
      });

      // Processa righe dati (dopo header, saltando righe vuote)
      for (let i = headerIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;

        const nome_ente = row[colMap.nome_ente] ? String(row[colMap.nome_ente]).trim() : '';
        const categoria_raw = row[colMap.categoria] ? String(row[colMap.categoria]).trim() : '';
        if (!nome_ente || !categoria_raw) continue;
        // Ignora righe note/legenda
        if (nome_ente.startsWith('*') || categoria_raw.startsWith('*')) continue;

        const categoria = normalizzaCategoria(categoria_raw);
        const comune_erogatore = row[colMap.comune_erogatore] ? String(row[colMap.comune_erogatore]).trim() : sheetName.trim();
        const contatto = row[colMap.contatto] != null ? String(row[colMap.contatto]).trim() : null;
        const orario_giorno = row[colMap.orario_giorno] ? String(row[colMap.orario_giorno]).trim().replace(/\s+/g, ' ') : null;
        const in_loco = normalizzaInLoco(row[colMap.in_loco]);
        const target_utenza = row[colMap.target_utenza] ? String(row[colMap.target_utenza]).trim() : null;
        const note_accesso = row[colMap.note_accesso] ? String(row[colMap.note_accesso]).trim() : null;

        try {
          // Inserisci ente (ogni riga = un ente con un servizio)
          const [result] = await pool.query(
            `INSERT INTO enti_welfare (nome_ente, comune_erogatore, contatto, orario_giorno, in_loco, target_utenza, note_accesso, attivo, creato_da) VALUES (?,?,?,?,?,?,?,1,?)`,
            [nome_ente, comune_erogatore, contatto, orario_giorno, in_loco, target_utenza, note_accesso, req.user.id]
          );
          const enteId = result.insertId;
          totEnti++;

          // Inserisci servizio
          await pool.query(
            'INSERT INTO servizi_welfare (ente_id, categoria, attivo) VALUES (?,?,1)',
            [enteId, categoria]
          );
          totServizi++;

          // Geocodifica background
          if (comune_erogatore) {
            geocodeAddress('', comune_erogatore).then(geo => {
              if (geo) pool.query('UPDATE enti_welfare SET latitudine=?, longitudine=? WHERE id=?', [geo.lat, geo.lng, enteId]);
            }).catch(() => {});
          }
        } catch (rowErr) {
          errori.push(`Foglio "${sheetName}", riga ${i + 1}: ${rowErr.message}`);
        }
      }
    }

    await logAudit(req.user, 'IMPORT', 'enti_welfare', null, null, { enti: totEnti, servizi: totServizi, modalita }, req.ip);
    res.json({
      message: `Importazione completata: ${totEnti} enti e ${totServizi} servizi importati da ${wb.SheetNames.length} fogli`,
      enti: totEnti,
      servizi: totServizi,
      fogli: wb.SheetNames.length,
      errori: errori.length > 0 ? errori : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante l\'importazione: ' + err.message });
  }
});

module.exports = router;
