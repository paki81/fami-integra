const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [[benTotale]] = await pool.query('SELECT COUNT(*) as n FROM beneficiari');
    const [[benInCorso]] = await pool.query("SELECT COUNT(*) as n FROM beneficiari WHERE stato = 'In Corso'");
    const [[benAbbinati]] = await pool.query("SELECT COUNT(*) as n FROM beneficiari WHERE stato IN ('Abbinato Alloggio','Abbinato Lavoro','Abbinato Entrambi','Completato')");

    const [[alloggiTotale]] = await pool.query('SELECT COUNT(*) as n FROM alloggi');
    const [[alloggiDisponibili]] = await pool.query("SELECT COUNT(*) as n FROM alloggi WHERE stato = 'Disponibile'");

    const [[aziendeTotale]] = await pool.query('SELECT COUNT(*) as n FROM aziende');
    const [[aziendeDisponibili]] = await pool.query("SELECT COUNT(*) as n FROM aziende WHERE disponibile = 'S'");

    const [[matchAlloggi]] = await pool.query('SELECT COUNT(*) as n FROM matching_alloggi');
    const [[matchLavoro]] = await pool.query('SELECT COUNT(*) as n FROM matching_lavoro');
    const [[contrattiFirmati]] = await pool.query("SELECT COUNT(*) as n FROM matching_alloggi WHERE contratto_firmato = 'S'");

    res.json({
      beneficiari: { totale: benTotale.n, in_corso: benInCorso.n, abbinati: benAbbinati.n },
      alloggi: { totale: alloggiTotale.n, disponibili: alloggiDisponibili.n },
      aziende: { totale: aziendeTotale.n, disponibili: aziendeDisponibili.n },
      matching: { alloggi: matchAlloggi.n, lavoro: matchLavoro.n, contratti_firmati: contrattiFirmati.n }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/dashboard/beneficiari-per-comune
router.get('/beneficiari-per-comune', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT comune, COUNT(*) as totale, 
              SUM(CASE WHEN stato = 'In Corso' THEN 1 ELSE 0 END) as in_corso,
              SUM(CASE WHEN stato IN ('Abbinato Alloggio','Abbinato Lavoro','Abbinato Entrambi') THEN 1 ELSE 0 END) as abbinati
       FROM beneficiari WHERE comune IS NOT NULL GROUP BY comune ORDER BY totale DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// GET /api/dashboard/uscite-prossime
router.get('/uscite-prossime', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, cognome, nome, comune, data_uscita_sai, n_componenti_nucleo, area_intervento, stato
       FROM beneficiari 
       WHERE stato = 'In Corso' AND data_uscita_sai >= CURDATE()
       ORDER BY data_uscita_sai ASC LIMIT 20`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// GET /api/dashboard/matching-recenti
router.get('/matching-recenti', authenticate, async (req, res) => {
  try {
    const [alloggi] = await pool.query(
      `SELECT ma.id, ma.data_match, b.cognome, b.nome, a.id_alloggio, a.comune, 'alloggio' as tipo
       FROM matching_alloggi ma JOIN beneficiari b ON ma.id_beneficiario = b.id JOIN alloggi a ON ma.id_alloggio = a.id
       ORDER BY ma.creato_il DESC LIMIT 5`
    );
    const [lavoro] = await pool.query(
      `SELECT ml.id, ml.data_match, b.cognome, b.nome, az.nome_azienda, az.comune, 'lavoro' as tipo
       FROM matching_lavoro ml JOIN beneficiari b ON ml.id_beneficiario = b.id JOIN aziende az ON ml.id_azienda = az.id
       ORDER BY ml.creato_il DESC LIMIT 5`
    );
    res.json({ alloggi, lavoro });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;
