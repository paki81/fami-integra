const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/foto_alloggi');

// Multer config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato file non supportato. Usa JPG, PNG o WebP.'));
  }
});

// POST /api/foto-alloggi/:alloggioId - Upload foto
router.post('/:alloggioId', authenticate, authorize('superadmin', 'admin', 'tutor'), upload.array('foto', 10), async (req, res) => {
  try {
    const { alloggioId } = req.params;
    const descrizione = req.body.descrizione || '';

    // Verifica che l'alloggio esista
    const [alloggio] = await pool.query('SELECT id FROM alloggi WHERE id = ?', [alloggioId]);
    if (!alloggio.length) return res.status(404).json({ error: 'Alloggio non trovato' });

    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Nessun file caricato' });

    const results = [];
    for (const file of req.files) {
      const filename = `alloggio_${alloggioId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.webp`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // Comprimi e converti in WebP
      await sharp(file.buffer)
        .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath);

      const [result] = await pool.query(
        'INSERT INTO foto_alloggi (alloggio_id, filename, path, descrizione, creato_da) VALUES (?, ?, ?, ?, ?)',
        [alloggioId, filename, `/uploads/foto_alloggi/${filename}`, descrizione, req.user.id]
      );

      results.push({ id: result.insertId, filename, path: `/uploads/foto_alloggi/${filename}` });
    }

    res.status(201).json({ message: `${results.length} foto caricate`, foto: results });
  } catch (err) {
    console.error('Upload foto error:', err);
    res.status(500).json({ error: err.message || 'Errore server' });
  }
});

// GET /api/foto-alloggi/:alloggioId - Lista foto
router.get('/:alloggioId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, u.nome as caricato_da_nome, u.cognome as caricato_da_cognome 
       FROM foto_alloggi f LEFT JOIN utenti u ON f.creato_da = u.id 
       WHERE f.alloggio_id = ? ORDER BY f.creato_il DESC`,
      [req.params.alloggioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/foto-alloggi/foto/:id - Elimina foto
router.delete('/foto/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM foto_alloggi WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Foto non trovata' });

    const filepath = path.join(__dirname, '../../', rows[0].path);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    await pool.query('DELETE FROM foto_alloggi WHERE id = ?', [req.params.id]);
    res.json({ message: 'Foto eliminata' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
