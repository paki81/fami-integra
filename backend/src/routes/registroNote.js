const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/registro-note/:entita/:entitaId - Lista note per entità
router.get('/:entita/:entitaId', authenticate, async (req, res) => {
  try {
    const { entita, entitaId } = req.params;
    if (!['beneficiari', 'alloggi', 'aziende'].includes(entita)) {
      return res.status(400).json({ error: 'Entità non valida' });
    }
    const [rows] = await pool.query(
      `SELECT rn.*, u.nome as autore_nome, u.cognome as autore_cognome
       FROM registro_note rn
       JOIN utenti u ON rn.creato_da = u.id
       WHERE rn.entita = ? AND rn.entita_id = ?
       ORDER BY rn.creato_il DESC`,
      [entita, entitaId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/registro-note/:entita/:entitaId - Aggiungi nota
router.post('/:entita/:entitaId', authenticate, async (req, res) => {
  try {
    const { entita, entitaId } = req.params;
    const { testo } = req.body;
    if (!['beneficiari', 'alloggi', 'aziende'].includes(entita)) {
      return res.status(400).json({ error: 'Entità non valida' });
    }
    if (!testo || !testo.trim()) {
      return res.status(400).json({ error: 'Testo nota obbligatorio' });
    }
    const [result] = await pool.query(
      'INSERT INTO registro_note (entita, entita_id, testo, creato_da) VALUES (?, ?, ?, ?)',
      [entita, entitaId, testo.trim(), req.user.id]
    );
    const [rows] = await pool.query(
      `SELECT rn.*, u.nome as autore_nome, u.cognome as autore_cognome
       FROM registro_note rn
       JOIN utenti u ON rn.creato_da = u.id
       WHERE rn.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/registro-note/:id - Modifica nota (solo admin/superadmin)
router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { testo } = req.body;
    if (!testo || !testo.trim()) {
      return res.status(400).json({ error: 'Testo nota obbligatorio' });
    }
    const [old] = await pool.query('SELECT * FROM registro_note WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Nota non trovata' });

    await pool.query('UPDATE registro_note SET testo = ? WHERE id = ?', [testo.trim(), req.params.id]);
    const [rows] = await pool.query(
      `SELECT rn.*, u.nome as autore_nome, u.cognome as autore_cognome
       FROM registro_note rn
       JOIN utenti u ON rn.creato_da = u.id
       WHERE rn.id = ?`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/registro-note/:id - Elimina nota (solo admin/superadmin)
router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM registro_note WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Nota non trovata' });

    await pool.query('DELETE FROM registro_note WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
