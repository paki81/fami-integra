const jwt = require('jsonwebtoken');
const pool = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fami-jwt-secret-change-in-production-2024';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, nome, cognome, email, ruolo, tenant_id, attivo FROM utenti WHERE id = ?', [decoded.id]);
    if (!rows.length || !rows[0].attivo) {
      return res.status(401).json({ error: 'Utente non autorizzato o disattivato' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token scaduto' });
    }
    return res.status(401).json({ error: 'Token non valido' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.ruolo)) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }
    next();
  };
};

const canModifyOwn = (req, res, next) => {
  if (['superadmin', 'admin'].includes(req.user.ruolo)) {
    return next();
  }
  if (['tutor', 'counselor'].includes(req.user.ruolo)) {
    req.filterByUser = true;
    return next();
  }
  return res.status(403).json({ error: 'Permessi insufficienti' });
};

module.exports = { authenticate, authorize, canModifyOwn, JWT_SECRET };
