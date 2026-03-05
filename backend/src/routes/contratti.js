const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

// GET /api/contratti
router.get('/', authenticate, async (req, res) => {
  try {
    const { stato_contratto, page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = ['1=1'], params = [];
    if (stato_contratto) { where.push('mc.stato_contratto = ?'); params.push(stato_contratto); }

    const whereClause = where.join(' AND ');
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM monitoraggio_contratti mc WHERE ${whereClause}`, params);
    const [rows] = await pool.query(
      `SELECT mc.*, b.cognome as ben_cognome, b.nome as ben_nome, a.id_alloggio, a.indirizzo
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
    const { id_beneficiario, id_alloggio, comune, data_inizio_contratto, data_fine_contratto, canone_mensile, contributo_progetto_mese, mesi_contributo_previsti } = req.body;
    if (!id_beneficiario || !id_alloggio) return res.status(400).json({ error: 'ID beneficiario e alloggio obbligatori' });

    const [result] = await pool.query(
      `INSERT INTO monitoraggio_contratti (id_beneficiario, id_alloggio, comune, data_inizio_contratto, data_fine_contratto, canone_mensile, contributo_progetto_mese, mesi_contributo_previsti)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_beneficiario, id_alloggio, comune, data_inizio_contratto, data_fine_contratto, canone_mensile, contributo_progetto_mese, mesi_contributo_previsti]
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

    const fields = ['data_fine_contratto', 'canone_mensile', 'contributo_progetto_mese', 'mesi_contributo_previsti', 'pagamenti_effettuati', 'ultimo_pagamento', 'stato_contratto'];
    const updates = [], values = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } });
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

module.exports = router;
