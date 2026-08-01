const express = require('express');
const router = express.Router();
const pool = require('../models/db');

const DEFAULTS = {
  ente: 'COMUNE DI [INSERIRE COMUNE]',
  progetto: 'PROGETTO “INTEGRA_Azioni”',
  sottotitolo: '(Sistema territoriale) per l\'Autonomia Economica e Sociale',
  fondo: 'FONDO ASILO MIGRAZIONE E INTEGRAZIONE (FAMI) 2021-2027',
  cup: 'O.S. 1 – Asilo – CUP G61H25000270006 – PROG-705',
};

async function ensureConfig() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS config (
      chiave VARCHAR(64) PRIMARY KEY,
      valore TEXT NOT NULL
    )
  `);
  const keys = Object.keys(DEFAULTS);
  const placeholders = keys.map(() => '(?, ?)').join(', ');
  const values = [];
  for (const [k, v] of Object.entries(DEFAULTS)) {
    values.push(k, v);
  }
  await pool.query(`
    INSERT IGNORE INTO config (chiave, valore)
    VALUES ${placeholders}
  `, values);
}

async function getConfig() {
  await ensureConfig();
  const keys = Object.keys(DEFAULTS);
  const [rows] = await pool.query(
    'SELECT chiave, valore FROM config WHERE chiave IN (?)',
    [keys]
  );
  const config = { ...DEFAULTS };
  for (const row of rows) {
    config[row.chiave] = row.valore;
  }
  return config;
}

// Endpoint pubblico (usato dal login)
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (err) {
    console.error('Errore lettura config:', err);
    res.status(500).json(DEFAULTS);
  }
});

module.exports = { router, getConfig, DEFAULTS };
