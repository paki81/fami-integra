const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { suggerisciAlloggi, suggerisciAziende } = require('../services/matchingEngine');

// GET /api/matching/suggerisci-alloggi/:idBeneficiario
router.get('/suggerisci-alloggi/:idBeneficiario', authenticate, async (req, res) => {
  try {
    const [benRows] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [req.params.idBeneficiario]);
    if (!benRows.length) return res.status(404).json({ error: 'Beneficiario non trovato' });

    const [alloggi] = await pool.query("SELECT * FROM alloggi WHERE stato = 'Disponibile'");
    const suggerimenti = await suggerisciAlloggi(benRows[0], alloggi);
    res.json({ beneficiario: benRows[0], suggerimenti });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/matching/suggerisci-aziende/:idBeneficiario
router.get('/suggerisci-aziende/:idBeneficiario', authenticate, async (req, res) => {
  try {
    const [benRows] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [req.params.idBeneficiario]);
    if (!benRows.length) return res.status(404).json({ error: 'Beneficiario non trovato' });

    const [aziende] = await pool.query("SELECT * FROM aziende WHERE disponibile = 'S'");
    const suggerimenti = await suggerisciAziende(benRows[0], aziende);
    res.json({ beneficiario: benRows[0], suggerimenti });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/matching/alloggi - Crea matching alloggio
router.post('/alloggi', authenticate, authorize('superadmin', 'admin', 'tutor'), async (req, res) => {
  try {
    const { id_beneficiario, id_alloggio, composizione_nucleo, comune_preferenza, budget_massimo, note } = req.body;
    if (!id_beneficiario || !id_alloggio) return res.status(400).json({ error: 'ID beneficiario e alloggio obbligatori' });

    const [result] = await pool.query(
      `INSERT INTO matching_alloggi (id_beneficiario, id_alloggio, composizione_nucleo, comune_preferenza, budget_massimo, note, creato_da) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_beneficiario, id_alloggio, composizione_nucleo, comune_preferenza, budget_massimo, note, req.user.id]
    );

    // Aggiorna stato alloggio
    await pool.query("UPDATE alloggi SET stato = 'In trattativa' WHERE id = ?", [id_alloggio]);

    // Aggiorna stato beneficiario
    const [ben] = await pool.query('SELECT stato FROM beneficiari WHERE id = ?', [id_beneficiario]);
    let nuovoStato = 'Abbinato Alloggio';
    if (ben[0]?.stato === 'Abbinato Lavoro') nuovoStato = 'Abbinato Entrambi';
    await pool.query('UPDATE beneficiari SET stato = ? WHERE id = ?', [nuovoStato, id_beneficiario]);

    const [newRow] = await pool.query('SELECT * FROM matching_alloggi WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'matching_alloggi', result.insertId, null, newRow[0], req.ip);
    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/matching/lavoro - Crea matching lavoro
router.post('/lavoro', authenticate, authorize('superadmin', 'admin', 'counselor'), async (req, res) => {
  try {
    const { id_beneficiario, id_azienda, mansione_proposta, note } = req.body;
    if (!id_beneficiario || !id_azienda) return res.status(400).json({ error: 'ID beneficiario e azienda obbligatori' });

    const [result] = await pool.query(
      `INSERT INTO matching_lavoro (id_beneficiario, id_azienda, mansione_proposta, note, creato_da) VALUES (?, ?, ?, ?, ?)`,
      [id_beneficiario, id_azienda, mansione_proposta, note, req.user.id]
    );

    const [ben] = await pool.query('SELECT stato FROM beneficiari WHERE id = ?', [id_beneficiario]);
    let nuovoStato = 'Abbinato Lavoro';
    if (ben[0]?.stato === 'Abbinato Alloggio') nuovoStato = 'Abbinato Entrambi';
    await pool.query('UPDATE beneficiari SET stato = ? WHERE id = ?', [nuovoStato, id_beneficiario]);

    const [newRow] = await pool.query('SELECT * FROM matching_lavoro WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'matching_lavoro', result.insertId, null, newRow[0], req.ip);
    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/matching/alloggi - Lista matching alloggi
router.get('/alloggi', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = '1=1';
    let params = [];
    if (['tutor'].includes(req.user.ruolo)) {
      where = 'ma.creato_da = ?';
      params.push(req.user.id);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM matching_alloggi ma WHERE ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT ma.*, b.cognome as ben_cognome, b.nome as ben_nome, b.n_componenti_nucleo, 
              a.id_alloggio, a.comune as alloggio_comune, a.indirizzo, a.tipologia, a.canone_mensile
       FROM matching_alloggi ma 
       JOIN beneficiari b ON ma.id_beneficiario = b.id 
       JOIN alloggi a ON ma.id_alloggio = a.id 
       WHERE ${where}
       ORDER BY ma.creato_il DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/matching/lavoro - Lista matching lavoro
router.get('/lavoro', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = '1=1';
    let params = [];
    if (['counselor'].includes(req.user.ruolo)) {
      where = 'ml.creato_da = ?';
      params.push(req.user.id);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM matching_lavoro ml WHERE ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT ml.*, b.cognome as ben_cognome, b.nome as ben_nome,
              b.nazionalita as ben_nazionalita, b.livello_italiano as ben_livello_italiano, b.competenze as ben_competenze,
              az.id_azienda, az.nome_azienda, az.settore, az.mansione_profilo
       FROM matching_lavoro ml 
       JOIN beneficiari b ON ml.id_beneficiario = b.id 
       JOIN aziende az ON ml.id_azienda = az.id 
       WHERE ${where}
       ORDER BY ml.creato_il DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/matching/alloggi/:id
router.put('/alloggi/:id', authenticate, authorize('superadmin', 'admin', 'tutor'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM matching_alloggi WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Matching non trovato' });

    const fields = ['data_sopralluogo', 'esito_sopralluogo', 'contratto_firmato', 'data_inizio_contratto', 'contributo_progetto', 'note', 'stato_match'];
    const dateFields = ['data_sopralluogo', 'data_inizio_contratto'];
    const updates = [], values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f] === '' && dateFields.includes(f) ? null : req.body[f]);
      }
    });
    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE matching_alloggi SET ${updates.join(', ')} WHERE id = ?`, values);

    // Se contratto firmato, aggiorna stato alloggio a Occupato
    if (req.body.contratto_firmato === 'S') {
      await pool.query("UPDATE alloggi SET stato = 'Occupato' WHERE id = ?", [old[0].id_alloggio]);
    }

    const [updated] = await pool.query('SELECT * FROM matching_alloggi WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'matching_alloggi', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/matching/lavoro/:id
router.put('/lavoro/:id', authenticate, authorize('superadmin', 'admin', 'counselor'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM matching_lavoro WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Matching non trovato' });

    const fields = ['mansione_proposta', 'esito', 'data_avvio', 'note', 'stato_match'];
    const dateFields = ['data_avvio'];
    const updates = [], values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f] === '' && dateFields.includes(f) ? null : req.body[f]);
      }
    });
    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE matching_lavoro SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM matching_lavoro WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'matching_lavoro', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Funzione helper per ricalcolare lo stato del beneficiario
async function ricalcolaStatoBeneficiario(idBeneficiario) {
  const [alloggiAttivi] = await pool.query("SELECT COUNT(*) as c FROM matching_alloggi WHERE id_beneficiario = ? AND stato_match = 'Attivo'", [idBeneficiario]);
  const [lavoroAttivi] = await pool.query("SELECT COUNT(*) as c FROM matching_lavoro WHERE id_beneficiario = ? AND stato_match = 'Attivo'", [idBeneficiario]);
  const haAlloggio = alloggiAttivi[0].c > 0;
  const haLavoro = lavoroAttivi[0].c > 0;
  let nuovoStato = 'In Corso';
  if (haAlloggio && haLavoro) nuovoStato = 'Abbinato Entrambi';
  else if (haAlloggio) nuovoStato = 'Abbinato Alloggio';
  else if (haLavoro) nuovoStato = 'Abbinato Lavoro';
  await pool.query('UPDATE beneficiari SET stato = ? WHERE id = ?', [nuovoStato, idBeneficiario]);
}

// PATCH /api/matching/alloggi/:id/annulla
router.patch('/alloggi/:id/annulla', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM matching_alloggi WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Matching non trovato' });
    if (old[0].stato_match === 'Annullato') return res.status(400).json({ error: 'Matching già annullato' });

    await pool.query("UPDATE matching_alloggi SET stato_match = 'Annullato' WHERE id = ?", [req.params.id]);

    // Rimetti alloggio disponibile
    await pool.query("UPDATE alloggi SET stato = 'Disponibile' WHERE id = ?", [old[0].id_alloggio]);

    // Ricalcola stato beneficiario
    await ricalcolaStatoBeneficiario(old[0].id_beneficiario);

    const [updated] = await pool.query('SELECT * FROM matching_alloggi WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'matching_alloggi', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PATCH /api/matching/lavoro/:id/annulla
router.patch('/lavoro/:id/annulla', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM matching_lavoro WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Matching non trovato' });
    if (old[0].stato_match === 'Annullato') return res.status(400).json({ error: 'Matching già annullato' });

    await pool.query("UPDATE matching_lavoro SET stato_match = 'Annullato' WHERE id = ?", [req.params.id]);

    // Ricalcola stato beneficiario
    await ricalcolaStatoBeneficiario(old[0].id_beneficiario);

    const [updated] = await pool.query('SELECT * FROM matching_lavoro WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'matching_lavoro', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/matching/alloggi/:id
router.delete('/alloggi/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM matching_alloggi WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Matching non trovato' });

    await pool.query('DELETE FROM matching_alloggi WHERE id = ?', [req.params.id]);
    if (old[0].stato_match === 'Attivo') {
      await pool.query("UPDATE alloggi SET stato = 'Disponibile' WHERE id = ?", [old[0].id_alloggio]);
      await ricalcolaStatoBeneficiario(old[0].id_beneficiario);
    }

    await logAudit(req.user, 'DELETE', 'matching_alloggi', req.params.id, old[0], null, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/matching/lavoro/:id
router.delete('/lavoro/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM matching_lavoro WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Matching non trovato' });

    await pool.query('DELETE FROM matching_lavoro WHERE id = ?', [req.params.id]);
    if (old[0].stato_match === 'Attivo') {
      await ricalcolaStatoBeneficiario(old[0].id_beneficiario);
    }

    await logAudit(req.user, 'DELETE', 'matching_lavoro', req.params.id, old[0], null, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
