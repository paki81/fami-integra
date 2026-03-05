const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

// GET /api/utenti
router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nome, cognome, email, ruolo, tenant_id, attivo, ultimo_accesso, creato_il FROM utenti ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/utenti
router.post('/', authenticate, authorize('superadmin'), [
  body('nome').notEmpty().trim(),
  body('cognome').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('ruolo').isIn(['superadmin', 'admin', 'tutor', 'counselor', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, cognome, email, password, ruolo, tenant_id } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, cognome, email, hash, ruolo, tenant_id || 'default']
    );

    await logAudit(req.user, 'CREATE', 'utenti', result.insertId, null, { nome, cognome, email, ruolo }, req.ip);
    res.status(201).json({ id: result.insertId, nome, cognome, email, ruolo });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email già registrata' });
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/utenti/:id
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT id, nome, cognome, email, ruolo, attivo FROM utenti WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Utente non trovato' });

    const { nome, cognome, email, ruolo, attivo, password } = req.body;
    const updates = [], values = [];

    if (nome) { updates.push('nome = ?'); values.push(nome); }
    if (cognome) { updates.push('cognome = ?'); values.push(cognome); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (ruolo) { updates.push('ruolo = ?'); values.push(ruolo); }
    if (attivo !== undefined) { updates.push('attivo = ?'); values.push(attivo ? 1 : 0); }
    if (password) { const hash = await bcrypt.hash(password, 10); updates.push('password_hash = ?'); values.push(hash); }

    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE utenti SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT id, nome, cognome, email, ruolo, attivo FROM utenti WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'utenti', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email già registrata' });
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/utenti/:id
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Non puoi eliminare te stesso' });
    const [old] = await pool.query('SELECT id, nome, cognome, email, ruolo FROM utenti WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Utente non trovato' });

    await pool.query('DELETE FROM utenti WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'utenti', req.params.id, old[0], null, req.ip);
    res.json({ message: 'Utente eliminato' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
