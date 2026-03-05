const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, authorize, canModifyOwn } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

// GET /api/beneficiari
router.get('/', authenticate, async (req, res) => {
  try {
    const { comune, stato, area_intervento, search, page = 1, limit = 25, sort = 'id', order = 'DESC' } = req.query;
    const allowedSort = ['id', 'cognome', 'nome', 'comune', 'data_uscita_sai', 'stato', 'n_componenti_nucleo', 'creato_il'];
    const sortCol = allowedSort.includes(sort) ? sort : 'id';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = ['1=1'];
    let params = [];

    if (comune) { where.push('comune = ?'); params.push(comune); }
    if (stato) {
      const stati = stato.split(',').map(s => s.trim()).filter(Boolean);
      if (stati.length === 1) { where.push('stato = ?'); params.push(stati[0]); }
      else if (stati.length > 1) { where.push(`stato IN (${stati.map(() => '?').join(',')})`); params.push(...stati); }
    }
    if (area_intervento) { where.push('area_intervento LIKE ?'); params.push(`%${area_intervento}%`); }
    if (search) { where.push('(cognome LIKE ? OR nome LIKE ? OR note LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    if (req.user.ruolo === 'tutor' || req.user.ruolo === 'counselor') {
      where.push('(assegnato_a = ? OR assegnato_a IS NULL)');
      params.push(req.user.id);
    }

    const whereClause = where.join(' AND ');
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM beneficiari WHERE ${whereClause}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM beneficiari WHERE ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/beneficiari/comuni
router.get('/comuni', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT comune FROM beneficiari WHERE comune IS NOT NULL ORDER BY comune');
    res.json(rows.map(r => r.comune));
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/beneficiari/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Beneficiario non trovato' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/beneficiari
router.post('/', authenticate, authorize('superadmin', 'admin', 'tutor', 'counselor'), [
  body('cognome').notEmpty().trim(),
  body('nome').notEmpty().trim(),
  body('n_componenti_nucleo').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const fields = ['cognome', 'nome', 'tipo_permesso', 'nucleo_singolo', 'n_componenti_nucleo', 'area_intervento', 'comune', 'note', 'data_uscita_sai', 'stato', 'competenze', 'nazionalita', 'livello_italiano', 'telefono', 'email', 'assegnato_a'];
    const values = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
    const placeholders = fields.map(() => '?').join(', ');

    const [result] = await pool.query(
      `INSERT INTO beneficiari (${fields.join(', ')}) VALUES (${placeholders})`, values
    );

    const [newRow] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'beneficiari', result.insertId, null, newRow[0], req.ip);
    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/beneficiari/:id
router.put('/:id', authenticate, authorize('superadmin', 'admin', 'tutor', 'counselor'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Beneficiario non trovato' });

    if (['tutor', 'counselor'].includes(req.user.ruolo) && old[0].assegnato_a && old[0].assegnato_a !== req.user.id) {
      return res.status(403).json({ error: 'Non puoi modificare questo beneficiario' });
    }

    const fields = ['cognome', 'nome', 'tipo_permesso', 'nucleo_singolo', 'n_componenti_nucleo', 'area_intervento', 'comune', 'note', 'data_uscita_sai', 'stato', 'competenze', 'nazionalita', 'livello_italiano', 'telefono', 'email', 'assegnato_a'];
    const updates = [];
    const values = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        let val = req.body[f];
        // Converti stringhe vuote in NULL per campi data e numerici
        if (val === '' && ['data_uscita_sai', 'n_componenti_nucleo', 'assegnato_a'].includes(f)) val = null;
        values.push(val);
      }
    });

    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE beneficiari SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'beneficiari', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/beneficiari/:id
router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM beneficiari WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Beneficiario non trovato' });

    await pool.query('DELETE FROM beneficiari WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'beneficiari', req.params.id, old[0], null, req.ip);
    res.json({ message: 'Beneficiario eliminato' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
