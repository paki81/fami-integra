const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

// GET /api/contratti
router.get('/', authenticate, async (req, res) => {
  try {
    const { stato_contratto, search, page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = ['1=1'], params = [];
    if (stato_contratto) { where.push('mc.stato_contratto = ?'); params.push(stato_contratto); }
    if (search) { where.push('(b.cognome LIKE ? OR b.nome LIKE ? OR a.id_alloggio LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const whereClause = where.join(' AND ');
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM monitoraggio_contratti mc
       JOIN beneficiari b ON mc.id_beneficiario = b.id
       JOIN alloggi a ON mc.id_alloggio = a.id
       WHERE ${whereClause}`, params);
    const [rows] = await pool.query(
      `SELECT mc.*, b.cognome as ben_cognome, b.nome as ben_nome,
              a.id_alloggio, a.indirizzo, a.comune as alloggio_comune
       FROM monitoraggio_contratti mc
       JOIN beneficiari b ON mc.id_beneficiario = b.id
       JOIN alloggi a ON mc.id_alloggio = a.id
       WHERE ${whereClause} ORDER BY mc.creato_il DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/contratti
router.post('/', authenticate, authorize('superadmin', 'admin', 'tutor'), async (req, res) => {
  try {
    const { id_beneficiario, id_alloggio, id_matching, comune, data_inizio_contratto, data_fine_contratto, canone_mensile, contributo_mensile, mesi_contributo_previsti, note } = req.body;
    if (!id_beneficiario || !id_alloggio) return res.status(400).json({ error: 'ID beneficiario e alloggio obbligatori' });

    const dateFields = ['data_inizio_contratto', 'data_fine_contratto'];
    const vals = { id_beneficiario, id_alloggio, id_matching: id_matching || null, comune: comune || null,
      data_inizio_contratto: data_inizio_contratto || null, data_fine_contratto: data_fine_contratto || null,
      canone_mensile: canone_mensile || null, contributo_mensile: contributo_mensile || 0,
      mesi_contributo_previsti: mesi_contributo_previsti || 0, note: note || null, creato_da: req.user.id };

    const fields = Object.keys(vals);
    const [result] = await pool.query(
      `INSERT INTO monitoraggio_contratti (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      fields.map(f => vals[f])
    );

    const [newRow] = await pool.query('SELECT * FROM monitoraggio_contratti WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'monitoraggio_contratti', result.insertId, null, newRow[0], req.ip);
    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/contratti/:id
router.put('/:id', authenticate, authorize('superadmin', 'admin', 'tutor'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM monitoraggio_contratti WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Contratto non trovato' });

    const fields = ['comune', 'data_inizio_contratto', 'data_fine_contratto', 'canone_mensile', 'contributo_mensile', 'mesi_contributo_previsti', 'pagamenti_effettuati', 'ultimo_pagamento', 'stato_contratto', 'note'];
    const dateFields = ['data_inizio_contratto', 'data_fine_contratto', 'ultimo_pagamento'];
    const numFields = ['canone_mensile', 'contributo_mensile', 'mesi_contributo_previsti', 'pagamenti_effettuati'];
    const updates = [], values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        let v = req.body[f];
        if (v === '' && (dateFields.includes(f) || numFields.includes(f))) v = null;
        values.push(v);
      }
    });
    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE monitoraggio_contratti SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM monitoraggio_contratti WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'monitoraggio_contratti', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/contratti/:id
router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM monitoraggio_contratti WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Contratto non trovato' });
    await pool.query('DELETE FROM monitoraggio_contratti WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'monitoraggio_contratti', req.params.id, old[0], null, req.ip);
    res.json({ message: 'Contratto eliminato' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
