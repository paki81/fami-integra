const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { geocodeAddress } = require('../utils/geocoder');

async function autoGeocode(id, indirizzo, comune) {
  if (!indirizzo || !comune) return;
  try {
    const result = await geocodeAddress(indirizzo, comune);
    if (result) {
      await pool.query('UPDATE alloggi SET latitudine = ?, longitudine = ? WHERE id = ?', [result.lat, result.lng, id]);
    }
  } catch (err) { console.error('Geocoding auto alloggio:', err.message); }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { comune, cap, stato, tipologia, search, page = 1, limit = 25, sort = 'id', order = 'DESC' } = req.query;
    const allowedSort = ['id', 'id_alloggio', 'comune', 'cap', 'tipologia', 'n_vani', 'canone_mensile', 'stato', 'disponibile_da'];
    const sortCol = allowedSort.includes(sort) ? sort : 'id';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = ['1=1'], params = [];
    if (comune) { where.push('comune = ?'); params.push(comune); }
    if (cap) { where.push('cap = ?'); params.push(cap); }
    if (stato) { where.push('stato = ?'); params.push(stato); }
    if (tipologia) { where.push('tipologia = ?'); params.push(tipologia); }
    if (search) { where.push('(id_alloggio LIKE ? OR indirizzo LIKE ? OR comune LIKE ? OR cap LIKE ? OR proprietario LIKE ? OR note LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }

    const whereClause = where.join(' AND ');
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM alloggi WHERE ${whereClause}`, params);
    const [rows] = await pool.query(`SELECT * FROM alloggi WHERE ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.get('/comuni', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT comune FROM alloggi WHERE comune IS NOT NULL ORDER BY comune');
    res.json(rows.map(r => r.comune));
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM alloggi WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Alloggio non trovato' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/', authenticate, authorize('superadmin', 'admin', 'tutor'), [
  body('id_alloggio').notEmpty().trim(),
  body('n_vani').optional().isInt({ min: 1 }),
  body('canone_mensile').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const fields = ['id_alloggio', 'comune', 'cap', 'indirizzo', 'tipologia', 'n_vani', 'piano', 'canone_mensile', 'spese_incluse', 'proprietario', 'agenzia', 'telefono_referente', 'email_referente', 'data_primo_contatto', 'disponibile_da', 'stato', 'note'];
    const dateFields = ['data_primo_contatto', 'disponibile_da'];
    const numFields = ['n_vani', 'canone_mensile'];
    const values = fields.map(f => {
      let v = req.body[f] !== undefined ? req.body[f] : null;
      if (v === '' && (dateFields.includes(f) || numFields.includes(f))) v = null;
      return v;
    });
    const [result] = await pool.query(`INSERT INTO alloggi (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);

    const [newRow] = await pool.query('SELECT * FROM alloggi WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'alloggi', result.insertId, null, newRow[0], req.ip);
    // Geocodifica in background
    autoGeocode(result.insertId, req.body.indirizzo, req.body.comune);
    res.status(201).json(newRow[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'ID Alloggio già esistente' });
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.put('/:id', authenticate, authorize('superadmin', 'admin', 'tutor'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM alloggi WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Alloggio non trovato' });

    const fields = ['id_alloggio', 'comune', 'cap', 'indirizzo', 'tipologia', 'n_vani', 'piano', 'canone_mensile', 'spese_incluse', 'proprietario', 'agenzia', 'telefono_referente', 'email_referente', 'data_primo_contatto', 'disponibile_da', 'stato', 'note'];
    const updates = [], values = [];
    const dateFields = ['data_primo_contatto', 'disponibile_da'];
    const numFields = ['n_vani', 'canone_mensile'];
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
    await pool.query(`UPDATE alloggi SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM alloggi WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'alloggi', req.params.id, old[0], updated[0], req.ip);
    // Ri-geocodifica se indirizzo o comune sono cambiati
    const newIndirizzo = req.body.indirizzo !== undefined ? req.body.indirizzo : old[0].indirizzo;
    const newComune = req.body.comune !== undefined ? req.body.comune : old[0].comune;
    if (req.body.indirizzo !== undefined || req.body.comune !== undefined) {
      autoGeocode(req.params.id, newIndirizzo, newComune);
    }
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM alloggi WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Alloggio non trovato' });
    await pool.query('DELETE FROM alloggi WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'alloggi', req.params.id, old[0], null, req.ip);
    res.json({ message: 'Alloggio eliminato' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
