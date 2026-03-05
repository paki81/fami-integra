const pool = require('../models/db');

async function logAudit(utente, azione, tabella, recordId, datiPrecedenti, datiNuovi, ip) {
  try {
    await pool.query(
      `INSERT INTO audit_log (utente_id, utente_email, azione, tabella, record_id, dati_precedenti, dati_nuovi, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        utente?.id || null,
        utente?.email || 'sistema',
        azione,
        tabella,
        recordId || null,
        datiPrecedenti ? JSON.stringify(datiPrecedenti) : null,
        datiNuovi ? JSON.stringify(datiNuovi) : null,
        ip || null
      ]
    );
  } catch (err) {
    console.error('Errore audit log:', err.message);
  }
}

module.exports = { logAudit };
