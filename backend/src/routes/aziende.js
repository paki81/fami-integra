const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

router.get('/', authenticate, async (req, res) => {
  try {
    const { comune, settore, disponibile, search, page = 1, limit = 25, sort = 'id', order = 'DESC' } = req.query;
    const allowedSort = ['id', 'id_azienda', 'nome_azienda', 'settore', 'comune', 'disponibile'];
    const sortCol = allowedSort.includes(sort) ? sort : 'id';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = ['1=1'], params = [];
    if (comune) { where.push('comune = ?'); params.push(comune); }
    if (settore) { where.push('settore = ?'); params.push(settore); }
    if (disponibile) { where.push('disponibile = ?'); params.push(disponibile); }
    if (search) { where.push('(nome_azienda LIKE ? OR mansione_profilo LIKE ? OR referente LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const whereClause = where.join(' AND ');
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM aziende WHERE ${whereClause}`, params);
    const [rows] = await pool.query(`SELECT * FROM aziende WHERE ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.get('/comuni', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT comune FROM aziende WHERE comune IS NOT NULL ORDER BY comune');
    res.json(rows.map(r => r.comune));
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.get('/settori', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT settore FROM aziende WHERE settore IS NOT NULL ORDER BY settore');
    res.json(rows.map(r => r.settore));
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM aziende WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Azienda non trovata' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/', authenticate, authorize('superadmin', 'admin', 'counselor'), [
  body('id_azienda').notEmpty().trim(),
  body('nome_azienda').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const fields = ['id_azienda', 'nome_azienda', 'settore', 'mansione_profilo', 'tipo_contratto', 'orario', 'indirizzo', 'comune', 'referente', 'telefono', 'email', 'data_primo_contatto', 'esito_contatto', 'disponibile', 'tirocinio', 'note'];
    const values = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
    const [result] = await pool.query(`INSERT INTO aziende (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);

    const [newRow] = await pool.query('SELECT * FROM aziende WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'aziende', result.insertId, null, newRow[0], req.ip);
    res.status(201).json(newRow[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'ID Azienda già esistente' });
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.put('/:id', authenticate, authorize('superadmin', 'admin', 'counselor'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM aziende WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Azienda non trovata' });

    const fields = ['id_azienda', 'nome_azienda', 'settore', 'mansione_profilo', 'tipo_contratto', 'orario', 'indirizzo', 'comune', 'referente', 'telefono', 'email', 'data_primo_contatto', 'esito_contatto', 'disponibile', 'tirocinio', 'note'];
    const updates = [], values = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE aziende SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM aziende WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'aziende', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM aziende WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Azienda non trovata' });
    await pool.query('DELETE FROM aziende WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'aziende', req.params.id, old[0], null, req.ip);
    res.json({ message: 'Azienda eliminata' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
