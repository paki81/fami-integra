const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../models/db');

const FALLBACK_LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

const DEFAULTS = {
  ente: 'COMUNE DI [INSERIRE COMUNE]',
  progetto: 'PROGETTO “INTEGRA_Azioni”',
  sottotitolo: '(Sistema territoriale) per l\'Autonomia Economica e Sociale',
  fondo: 'FONDO ASILO MIGRAZIONE E INTEGRAZIONE (FAMI) 2021-2027',
  cup: 'O.S. 1 – Asilo – CUP G61H25000270006 – PROG-705',
  app_name: 'FAMI INTEGRA',
  app_slogan: 'Piattaforma Centro Sportello',
  org_name: 'Ente gestore',
  portal_url: 'https://integra.aswell.eu',
  smtp_host: 'smtp.gmail.com',
  smtp_port: '587',
  smtp_secure: 'false',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: 'FAMI INTEGRA <noreply@fami-integra.it>',
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
  const config = { ...DEFAULTS, logo_url: '/api/config/logo' };
  for (const row of rows) {
    config[row.chiave] = row.valore;
  }
  return config;
}

async function getLogoBuffer() {
  await ensureConfig();
  const [rows] = await pool.query('SELECT valore FROM config WHERE chiave = "logo"');
  if (rows.length && rows[0].valore) {
    return Buffer.from(rows[0].valore, 'base64');
  }
  return fs.existsSync(FALLBACK_LOGO_PATH) ? fs.readFileSync(FALLBACK_LOGO_PATH) : null;
}

async function setLogo(base64) {
  await ensureConfig();
  await pool.query(
    'INSERT INTO config (chiave, valore) VALUES ("logo", ?) ON DUPLICATE KEY UPDATE valore = VALUES(valore)',
    [base64]
  );
}

async function deleteLogo() {
  await ensureConfig();
  await pool.query('DELETE FROM config WHERE chiave = "logo"');
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

// Endpoint pubblico per logo
router.get('/logo', async (req, res) => {
  try {
    const buf = await getLogoBuffer();
    if (!buf) return res.status(404).send('Logo non trovato');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(buf);
  } catch (err) {
    console.error('Errore lettura logo:', err);
    res.status(500).send('Errore server');
  }
});

module.exports = { router, getConfig, getLogoBuffer, setLogo, deleteLogo, DEFAULTS };
