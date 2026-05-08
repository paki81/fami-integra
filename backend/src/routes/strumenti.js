const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const BACKUPS_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// POST /api/strumenti/svuota/:tabella - Svuota una tabella (SOLO superadmin)
router.post('/svuota/:tabella', authenticate, authorize('superadmin'), async (req, res) => {
  const tabelleConsentite = ['beneficiari', 'alloggi', 'aziende', 'enti_welfare'];
  const { tabella } = req.params;
  const { conferma } = req.body;

  if (!tabelleConsentite.includes(tabella)) {
    return res.status(400).json({ error: 'Tabella non consentita' });
  }

  // Doppia conferma: il client deve inviare il nome esatto della tabella
  if (conferma !== tabella) {
    return res.status(400).json({ error: 'Conferma non valida. Invia il nome esatto della tabella nel campo "conferma".' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Conta record prima della cancellazione
    const [countResult] = await conn.query(`SELECT COUNT(*) as tot FROM ${tabella}`);
    const totale = countResult[0].tot;

    if (totale === 0) {
      await conn.rollback();
      conn.release();
      return res.json({ message: `La tabella ${tabella} è già vuota`, eliminati: 0 });
    }

    // Elimina dati correlati
    if (tabella === 'enti_welfare') {
      await conn.query('DELETE FROM servizi_welfare');
    } else if (tabella === 'beneficiari') {
      await conn.query('DELETE FROM registro_note WHERE entita = "beneficiari"');
      await conn.query('DELETE FROM monitoraggio_contratti');
      await conn.query('DELETE FROM matching_alloggi');
      await conn.query('DELETE FROM matching_lavoro');
    } else if (tabella === 'alloggi') {
      await conn.query('DELETE FROM registro_note WHERE entita = "alloggi"');
      await conn.query('DELETE FROM foto_alloggi');
      await conn.query('DELETE FROM monitoraggio_contratti');
      await conn.query('DELETE FROM matching_alloggi');
    } else if (tabella === 'aziende') {
      await conn.query('DELETE FROM registro_note WHERE entita = "aziende"');
      await conn.query('DELETE FROM matching_lavoro');
    }

    await conn.query(`DELETE FROM ${tabella}`);
    await conn.query(`ALTER TABLE ${tabella} AUTO_INCREMENT = 1`);

    await conn.commit();

    await logAudit(req.user, 'SVUOTA_TABELLA', tabella, null, { totale_eliminati: totale }, null, req.ip);

    res.json({ message: `Tabella ${tabella} svuotata con successo`, eliminati: totale });
  } catch (err) {
    await conn.rollback();
    console.error('Errore svuotamento tabella:', err);
    res.status(500).json({ error: 'Errore durante lo svuotamento della tabella' });
  } finally {
    conn.release();
  }
});

// GET /api/strumenti/conteggi - Conteggi record per tabella (SOLO superadmin)
router.get('/conteggi', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const [ben] = await pool.query('SELECT COUNT(*) as tot FROM beneficiari');
    const [all] = await pool.query('SELECT COUNT(*) as tot FROM alloggi');
    const [az] = await pool.query('SELECT COUNT(*) as tot FROM aziende');
    const [matAll] = await pool.query('SELECT COUNT(*) as tot FROM matching_alloggi');
    const [matLav] = await pool.query('SELECT COUNT(*) as tot FROM matching_lavoro');
    const [con] = await pool.query('SELECT COUNT(*) as tot FROM monitoraggio_contratti');
    const [note] = await pool.query('SELECT COUNT(*) as tot FROM registro_note');
    const [entiW] = await pool.query('SELECT COUNT(*) as tot FROM enti_welfare');
    const [servW] = await pool.query('SELECT COUNT(*) as tot FROM servizi_welfare');
    res.json({
      beneficiari: ben[0].tot,
      alloggi: all[0].tot,
      aziende: az[0].tot,
      matching_alloggi: matAll[0].tot,
      matching_lavoro: matLav[0].tot,
      contratti: con[0].tot,
      registro_note: note[0].tot,
      enti_welfare: entiW[0].tot,
      servizi_welfare: servW[0].tot
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/strumenti/backup - Crea backup del database (SOLO superadmin)
router.post('/backup', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbUser = process.env.DB_USER || 'fami_user';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'fami_integra';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const filename = `backup_${dbName}_${timestamp}.sql`;
    const filepath = path.join(BACKUPS_DIR, filename);

    const cmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p'${dbPass}' --single-transaction --routines --triggers ${dbName} > ${filepath}`;
    execSync(cmd, { timeout: 120000 });

    // Comprimi con gzip
    execSync(`gzip ${filepath}`, { timeout: 60000 });
    const gzFilename = filename + '.gz';
    const gzFilepath = filepath + '.gz';

    const stats = fs.statSync(gzFilepath);

    await logAudit(req.user, 'BACKUP_DB', 'database', null, null, { filename: gzFilename, size: stats.size }, req.ip);

    res.json({
      message: 'Backup creato con successo',
      filename: gzFilename,
      size: stats.size,
      data: new Date().toISOString()
    });
  } catch (err) {
    console.error('Errore backup:', err);
    res.status(500).json({ error: 'Errore durante la creazione del backup' });
  }
});

// GET /api/strumenti/backup/lista - Lista backup disponibili (SOLO superadmin)
router.get('/backup/lista', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.sql.gz') || f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return { filename: f, size: stats.size, data: stats.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.data) - new Date(a.data));
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/strumenti/backup/download/:filename - Download backup (SOLO superadmin)
router.get('/backup/download/:filename', authenticate, authorize('superadmin'), (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9_.\-]/g, '');
  const filepath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Backup non trovato' });
  res.download(filepath, filename);
});

// DELETE /api/strumenti/backup/:filename - Elimina backup (SOLO superadmin)
router.delete('/backup/:filename', authenticate, authorize('superadmin'), async (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9_.\-]/g, '');
  const filepath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Backup non trovato' });
  try {
    fs.unlinkSync(filepath);
    await logAudit(req.user, 'DELETE_BACKUP', 'database', null, { filename }, null, req.ip);
    res.json({ message: 'Backup eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore eliminazione backup' });
  }
});

// POST /api/strumenti/ripristino - Ripristina database da backup (SOLO superadmin)
router.post('/ripristino', authenticate, authorize('superadmin'), upload.single('file'), async (req, res) => {
  try {
    const { conferma } = req.body;
    const filename = req.body.filename;

    if (conferma !== 'RIPRISTINA') {
      return res.status(400).json({ error: 'Conferma non valida. Invia "RIPRISTINA" nel campo conferma.' });
    }

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbUser = process.env.DB_USER || 'fami_user';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'fami_integra';

    let sqlFilepath;
    let tempFile = false;

    if (req.file) {
      // Upload di un file backup
      const uploadName = `upload_restore_${Date.now()}`;
      if (req.file.originalname.endsWith('.gz')) {
        const gzPath = path.join(BACKUPS_DIR, uploadName + '.sql.gz');
        fs.writeFileSync(gzPath, req.file.buffer);
        execSync(`gunzip -f ${gzPath}`, { timeout: 60000 });
        sqlFilepath = path.join(BACKUPS_DIR, uploadName + '.sql');
      } else {
        sqlFilepath = path.join(BACKUPS_DIR, uploadName + '.sql');
        fs.writeFileSync(sqlFilepath, req.file.buffer);
      }
      tempFile = true;
    } else if (filename) {
      // Ripristino da backup esistente
      const safeName = filename.replace(/[^a-zA-Z0-9_.\-]/g, '');
      const backupPath = path.join(BACKUPS_DIR, safeName);
      if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup non trovato' });

      if (safeName.endsWith('.gz')) {
        const sqlName = safeName.replace('.gz', '');
        const sqlPath = path.join(BACKUPS_DIR, sqlName);
        execSync(`gunzip -k -f ${backupPath}`, { timeout: 60000 });
        sqlFilepath = sqlPath;
        tempFile = true;
      } else {
        sqlFilepath = backupPath;
      }
    } else {
      return res.status(400).json({ error: 'Specifica un file di backup o un nome file esistente' });
    }

    const cmd = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p'${dbPass}' ${dbName} < ${sqlFilepath}`;
    execSync(cmd, { timeout: 300000 });

    // Pulisci file temporaneo
    if (tempFile && fs.existsSync(sqlFilepath)) {
      fs.unlinkSync(sqlFilepath);
    }

    await logAudit(req.user, 'RIPRISTINO_DB', 'database', null, { source: filename || req.file?.originalname }, null, req.ip);

    res.json({ message: 'Database ripristinato con successo' });
  } catch (err) {
    console.error('Errore ripristino:', err);
    res.status(500).json({ error: 'Errore durante il ripristino del database' });
  }
});

module.exports = router;
