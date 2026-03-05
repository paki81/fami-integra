const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate } = require('../middleware/auth');

// GET /api/comuni/search?q=cas&limit=15
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q = '', limit = 15 } = req.query;
    if (q.length < 2) return res.json([]);

    const [rows] = await pool.query(
      `SELECT nome, provincia, sigla, regione, cap 
       FROM comuni_italiani 
       WHERE nome LIKE ? 
       ORDER BY 
         CASE WHEN nome LIKE ? THEN 0 ELSE 1 END,
         LENGTH(nome), nome 
       LIMIT ?`,
      [`%${q}%`, `${q}%`, parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    console.error('Comuni search error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
