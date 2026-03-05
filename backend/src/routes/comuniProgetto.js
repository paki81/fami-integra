const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { geocodeAddress } = require('../utils/geocoder');

// GET /api/comuni-progetto - Lista comuni progetto
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comuni_progetto ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/comuni-progetto/nomi - Solo nomi attivi (per dropdown beneficiari)
router.get('/nomi', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT nome FROM comuni_progetto WHERE attivo = 1 ORDER BY nome ASC');
    res.json(rows.map(r => r.nome));
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/comuni-progetto/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comuni_progetto WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Comune non trovato' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/comuni-progetto
router.post('/', authenticate, authorize('superadmin', 'admin'), [
  body('nome').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, provincia, sigla, tipologia_progetto, ruolo_comune, indirizzo_sede, telefono_sede, email_sede, responsabile, note, attivo } = req.body;
    const [result] = await pool.query(
      `INSERT INTO comuni_progetto (nome, provincia, sigla, tipologia_progetto, ruolo_comune, indirizzo_sede, telefono_sede, email_sede, responsabile, note, attivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, provincia || null, sigla || null, tipologia_progetto || null, ruolo_comune || 'Altro', indirizzo_sede || null, telefono_sede || null, email_sede || null, responsabile || null, note || null, attivo !== undefined ? attivo : 1]
    );

    // Geocodifica sede in background
    if (indirizzo_sede && nome) {
      geocodeAddress(indirizzo_sede, nome).then(geo => {
        if (geo) pool.query('UPDATE comuni_progetto SET latitudine = ?, longitudine = ? WHERE id = ?', [geo.lat, geo.lng, result.insertId]);
      }).catch(() => {});
    }

    const [newRow] = await pool.query('SELECT * FROM comuni_progetto WHERE id = ?', [result.insertId]);
    await logAudit(req.user, 'CREATE', 'comuni_progetto', result.insertId, null, newRow[0], req.ip);
    res.status(201).json(newRow[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Comune già presente nel progetto' });
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/comuni-progetto/:id
router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM comuni_progetto WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Comune non trovato' });

    const fields = ['nome', 'provincia', 'sigla', 'tipologia_progetto', 'ruolo_comune', 'indirizzo_sede', 'telefono_sede', 'email_sede', 'responsabile', 'note', 'attivo'];
    const updates = [], values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f] === '' ? null : req.body[f]);
      }
    });
    if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

    values.push(req.params.id);
    await pool.query(`UPDATE comuni_progetto SET ${updates.join(', ')} WHERE id = ?`, values);

    // Ri-geocodifica se indirizzo o nome cambiati
    const newIndirizzo = req.body.indirizzo_sede !== undefined ? req.body.indirizzo_sede : old[0].indirizzo_sede;
    const newNome = req.body.nome !== undefined ? req.body.nome : old[0].nome;
    if (req.body.indirizzo_sede !== undefined || req.body.nome !== undefined) {
      if (newIndirizzo && newNome) {
        geocodeAddress(newIndirizzo, newNome).then(geo => {
          if (geo) pool.query('UPDATE comuni_progetto SET latitudine = ?, longitudine = ? WHERE id = ?', [geo.lat, geo.lng, req.params.id]);
        }).catch(() => {});
      }
    }

    const [updated] = await pool.query('SELECT * FROM comuni_progetto WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'UPDATE', 'comuni_progetto', req.params.id, old[0], updated[0], req.ip);
    res.json(updated[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Comune già presente nel progetto' });
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/comuni-progetto/:id
router.delete('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM comuni_progetto WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Comune non trovato' });
    await pool.query('DELETE FROM comuni_progetto WHERE id = ?', [req.params.id]);
    await logAudit(req.user, 'DELETE', 'comuni_progetto', req.params.id, old[0], null, req.ip);
    res.json({ message: 'Comune eliminato dal progetto' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
