const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { sendMail, resetPasswordTemplate } = require('../utils/mailer');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM utenti WHERE email = ? AND attivo = 1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Credenziali non valide' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenziali non valide' });

    await pool.query('UPDATE utenti SET ultimo_accesso = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, ruolo: user.ruolo, tenant_id: user.tenant_id },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await logAudit(user, 'LOGIN', 'utenti', user.id, null, null, req.ip);

    res.json({
      token,
      user: { id: user.id, nome: user.nome, cognome: user.cognome, email: user.email, ruolo: user.ruolo }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { oldPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT password_hash FROM utenti WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Password attuale non corretta' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE utenti SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    await logAudit(req.user, 'CAMBIO_PASSWORD', 'utenti', req.user.id, null, null, req.ip);

    res.json({ message: 'Password aggiornata' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const [rows] = await pool.query('SELECT id, nome, email FROM utenti WHERE email = ? AND attivo = 1', [email]);

    // Risposta generica per sicurezza (non rivela se l'email esiste)
    if (!rows.length) {
      return res.json({ message: 'Se l\'indirizzo email è registrato, riceverai le istruzioni per il ripristino.' });
    }

    const user = rows[0];

    // Invalida token precedenti
    await pool.query('UPDATE password_reset_tokens SET utilizzato = 1 WHERE utente_id = ? AND utilizzato = 0', [user.id]);

    // Genera token
    const token = crypto.randomBytes(32).toString('hex');
    const scadenza = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

    await pool.query(
      'INSERT INTO password_reset_tokens (utente_id, token, scadenza) VALUES (?, ?, ?)',
      [user.id, token, scadenza]
    );

    // Invia email
    const frontendUrl = process.env.FRONTEND_URL || 'https://integra.aswell.eu';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendMail(
      user.email,
      'Ripristino Password - FAMI INTEGRA',
      resetPasswordTemplate(user.nome, resetUrl)
    );

    await logAudit(user, 'RICHIESTA_RESET_PASSWORD', 'utenti', user.id, null, null, req.ip);

    res.json({ message: 'Se l\'indirizzo email è registrato, riceverai le istruzioni per il ripristino.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Errore durante l\'invio. Riprova più tardi.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, newPassword } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND utilizzato = 0 AND scadenza > NOW()',
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Il link di ripristino non è valido o è scaduto.' });
    }

    const resetToken = rows[0];

    // Aggiorna password
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE utenti SET password_hash = ? WHERE id = ?', [hash, resetToken.utente_id]);

    // Segna token come utilizzato
    await pool.query('UPDATE password_reset_tokens SET utilizzato = 1 WHERE id = ?', [resetToken.id]);

    const [userRows] = await pool.query('SELECT * FROM utenti WHERE id = ?', [resetToken.utente_id]);
    await logAudit(userRows[0], 'RESET_PASSWORD', 'utenti', resetToken.utente_id, null, null, req.ip);

    res.json({ message: 'Password reimpostata con successo. Ora puoi accedere con la nuova password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/auth/verify-reset-token/:token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT prt.id, u.nome, u.email FROM password_reset_tokens prt JOIN utenti u ON prt.utente_id = u.id WHERE prt.token = ? AND prt.utilizzato = 0 AND prt.scadenza > NOW()',
      [req.params.token]
    );
    if (!rows.length) return res.status(400).json({ valid: false, error: 'Token non valido o scaduto' });
    res.json({ valid: true, nome: rows[0].nome });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Errore server' });
  }
});

module.exports = router;
