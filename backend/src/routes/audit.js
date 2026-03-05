const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audit
router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { tabella, azione, utente_id, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let where = ['1=1'], params = [];
    if (tabella) { where.push('a.tabella = ?'); params.push(tabella); }
    if (azione) { where.push('a.azione = ?'); params.push(azione); }
    if (utente_id) { where.push('a.utente_id = ?'); params.push(utente_id); }

    const whereClause = where.join(' AND ');
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM audit_log a WHERE ${whereClause}`, params);
    const [rows] = await pool.query(
      `SELECT a.*, u.nome as utente_nome, u.cognome as utente_cognome
       FROM audit_log a LEFT JOIN utenti u ON a.utente_id = u.id
       WHERE ${whereClause} ORDER BY a.creato_il DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
