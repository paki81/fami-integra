const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { geocodeAddress } = require('../utils/geocoder');

// POST /api/geocoding/alloggi/:id - Geocodifica un alloggio
router.post('/alloggi/:id', authenticate, authorize('superadmin', 'admin', 'tutor'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, indirizzo, comune FROM alloggi WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Alloggio non trovato' });

    const { indirizzo, comune } = rows[0];
    if (!indirizzo || !comune) return res.status(400).json({ error: 'Indirizzo o comune mancante' });

    const result = await geocodeAddress(indirizzo, comune);
    if (!result) return res.status(404).json({ error: 'Indirizzo non trovato su OpenStreetMap' });

    await pool.query('UPDATE alloggi SET latitudine = ?, longitudine = ? WHERE id = ?', [result.lat, result.lng, req.params.id]);
    res.json({ lat: result.lat, lng: result.lng, display_name: result.display_name });
  } catch (err) {
    console.error('Geocoding alloggio error:', err);
    res.status(500).json({ error: 'Errore durante la geocodifica' });
  }
});

// POST /api/geocoding/aziende/:id - Geocodifica un'azienda
router.post('/aziende/:id', authenticate, authorize('superadmin', 'admin', 'counselor'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, indirizzo, comune FROM aziende WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Azienda non trovata' });

    const { indirizzo, comune } = rows[0];
    if (!indirizzo || !comune) return res.status(400).json({ error: 'Indirizzo o comune mancante' });

    const result = await geocodeAddress(indirizzo, comune);
    if (!result) return res.status(404).json({ error: 'Indirizzo non trovato su OpenStreetMap' });

    await pool.query('UPDATE aziende SET latitudine = ?, longitudine = ? WHERE id = ?', [result.lat, result.lng, req.params.id]);
    res.json({ lat: result.lat, lng: result.lng, display_name: result.display_name });
  } catch (err) {
    console.error('Geocoding azienda error:', err);
    res.status(500).json({ error: 'Errore durante la geocodifica' });
  }
});

// POST /api/geocoding/alloggi-tutti - Geocodifica tutti gli alloggi senza coordinate
router.post('/alloggi-tutti', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, indirizzo, comune FROM alloggi WHERE latitudine IS NULL AND indirizzo IS NOT NULL AND comune IS NOT NULL');
    let geocoded = 0, errori = 0;

    for (const row of rows) {
      try {
        const result = await geocodeAddress(row.indirizzo, row.comune);
        if (result) {
          await pool.query('UPDATE alloggi SET latitudine = ?, longitudine = ? WHERE id = ?', [result.lat, result.lng, row.id]);
          geocoded++;
        } else { errori++; }
        // Rate limit: 1 req/sec per Nominatim
        await new Promise(r => setTimeout(r, 1100));
      } catch { errori++; }
    }

    res.json({ message: `Geocodifica completata: ${geocoded} trovati, ${errori} errori su ${rows.length} totali` });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/geocoding/aziende-tutti - Geocodifica tutte le aziende senza coordinate
router.post('/aziende-tutti', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, indirizzo, comune FROM aziende WHERE latitudine IS NULL AND indirizzo IS NOT NULL AND comune IS NOT NULL');
    let geocoded = 0, errori = 0;

    for (const row of rows) {
      try {
        const result = await geocodeAddress(row.indirizzo, row.comune);
        if (result) {
          await pool.query('UPDATE aziende SET latitudine = ?, longitudine = ? WHERE id = ?', [result.lat, result.lng, row.id]);
          geocoded++;
        } else { errori++; }
        await new Promise(r => setTimeout(r, 1100));
      } catch { errori++; }
    }

    res.json({ message: `Geocodifica completata: ${geocoded} trovati, ${errori} errori su ${rows.length} totali` });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/geocoding/mappa/alloggi - Tutti gli alloggi con coordinate
router.get('/mappa/alloggi', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, id_alloggio, comune, indirizzo, tipologia, n_vani, canone_mensile, stato, latitudine, longitudine 
       FROM alloggi WHERE latitudine IS NOT NULL AND longitudine IS NOT NULL`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// GET /api/geocoding/mappa/aziende - Tutte le aziende con coordinate
router.get('/mappa/aziende', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nome_azienda, comune, indirizzo, settore, mansione_profilo, tipo_contratto, disponibile, latitudine, longitudine 
       FROM aziende WHERE latitudine IS NOT NULL AND longitudine IS NOT NULL`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
