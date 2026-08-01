const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const pool = require('../models/db');
const { getConfig } = require('./config');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');
const LOGO_BUFFER = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

// ----- Helpers -----------------------------------------------------------

function parseItems(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && (it.titolo || it.categoria || it.contenuto))
    .map((it) => ({
      categoria: it.categoria ? String(it.categoria).trim() : '',
      titolo: it.titolo ? String(it.titolo).trim() : '',
      contenuto: it.contenuto ? String(it.contenuto).trim() : '',
      fonte: it.fonte ? String(it.fonte).trim() : null,
    }));
}

function rowToConsultazione(row) {
  if (!row) return null;
  return {
    id: row.id,
    beneficiario_id: row.beneficiario_id,
    operatore_id: row.operatore_id,
    nome: row.nome,
    cognome: row.cognome,
    codice_fiscale: row.codice_fiscale,
    data_consulto: row.data_consulto,
    note: row.note,
    items: parseItems(row.items),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    operatore_nome: row.operatore_nome || null,
    operatore_cognome: row.operatore_cognome || null,
    operatore_email: row.operatore_email || null,
    beneficiario_codice_id: row.beneficiario_codice_id || null,
  };
}

async function loadConsultazione(id) {
  const [rows] = await pool.query(
    `SELECT c.*,
            u.nome AS operatore_nome, u.cognome AS operatore_cognome, u.email AS operatore_email,
            b.codice_id AS beneficiario_codice_id
       FROM welfare_consultazioni c
       LEFT JOIN utenti u ON c.operatore_id = u.id
       LEFT JOIN beneficiari b ON c.beneficiario_id = b.id
      WHERE c.id = ? AND c.deleted_at IS NULL`,
    [id]
  );
  return rows.length ? rowToConsultazione(rows[0]) : null;
}

function validatePayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['beneficiario_id', 'nome', 'cognome', 'data_consulto'];
  if (!partial) {
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        errors.push({ field: f, message: `${f} obbligatorio` });
      }
    }
  }
  if (body.beneficiario_id !== undefined && body.beneficiario_id !== null && body.beneficiario_id !== '') {
    if (Number.isNaN(parseInt(body.beneficiario_id, 10))) {
      errors.push({ field: 'beneficiario_id', message: 'beneficiario_id non valido' });
    }
  }
  if (body.data_consulto !== undefined && body.data_consulto !== null && body.data_consulto !== '') {
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(body.data_consulto))) {
      errors.push({ field: 'data_consulto', message: 'Formato data non valido (YYYY-MM-DD)' });
    }
  }
  if (body.status !== undefined && body.status !== null && body.status !== '') {
    if (!['bozza', 'finalizzata'].includes(body.status)) {
      errors.push({ field: 'status', message: 'status non valido' });
    }
  }
  if (body.items !== undefined && body.items !== null && !Array.isArray(body.items)) {
    errors.push({ field: 'items', message: 'items deve essere un array' });
  }
  return errors;
}

// ----- Routes ------------------------------------------------------------

// GET / - lista paginata con filtri
router.get(
  '/',
  authenticate,
  authorize('superadmin', 'admin', 'tutor', 'counselor'),
  async (req, res) => {
    try {
      const {
        data_da,
        data_a,
        operatore_id,
        beneficiario_id,
        status,
        search,
        page = 1,
        limit = 50,
        sort = 'data_consulto',
        order = 'DESC',
      } = req.query;

      const allowedSort = ['data_consulto', 'created_at', 'updated_at', 'cognome', 'status'];
      const sortCol = allowedSort.includes(sort) ? sort : 'data_consulto';
      const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const where = ['c.deleted_at IS NULL'];
      const params = [];

      if (data_da) { where.push('c.data_consulto >= ?'); params.push(data_da); }
      if (data_a) { where.push('c.data_consulto <= ?'); params.push(data_a); }
      if (operatore_id) { where.push('c.operatore_id = ?'); params.push(parseInt(operatore_id, 10)); }
      if (beneficiario_id) { where.push('c.beneficiario_id = ?'); params.push(parseInt(beneficiario_id, 10)); }
      if (status) { where.push('c.status = ?'); params.push(status); }
      if (search) {
        where.push('(c.nome LIKE ? OR c.cognome LIKE ? OR c.codice_fiscale LIKE ?)');
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      const pageN = Math.max(parseInt(page, 10) || 1, 1);
      const limitN = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
      const offset = (pageN - 1) * limitN;

      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM welfare_consultazioni c WHERE ${where.join(' AND ')}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT c.*,
                u.nome AS operatore_nome, u.cognome AS operatore_cognome,
                b.codice_id AS beneficiario_codice_id
           FROM welfare_consultazioni c
           LEFT JOIN utenti u ON c.operatore_id = u.id
           LEFT JOIN beneficiari b ON c.beneficiario_id = b.id
          WHERE ${where.join(' AND ')}
          ORDER BY c.${sortCol} ${sortOrder}
          LIMIT ? OFFSET ?`,
        [...params, limitN, offset]
      );

      res.json({
        data: rows.map(rowToConsultazione),
        total: countRows[0].total,
        page: pageN,
        limit: limitN,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Errore server' });
    }
  }
);

// GET /:id - dettaglio
router.get(
  '/:id',
  authenticate,
  authorize('superadmin', 'admin', 'tutor', 'counselor'),
  async (req, res) => {
    try {
      const c = await loadConsultazione(req.params.id);
      if (!c) return res.status(404).json({ error: 'Consultazione non trovata' });
      res.json(c);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Errore server' });
    }
  }
);

// POST / - crea
router.post(
  '/',
  authenticate,
  authorize('superadmin', 'admin', 'tutor', 'counselor'),
  async (req, res) => {
    try {
      const errors = validatePayload(req.body);
      if (errors.length) return res.status(400).json({ errors });

      // Verifica beneficiario esiste
      const [ben] = await pool.query('SELECT id FROM beneficiari WHERE id = ?', [
        parseInt(req.body.beneficiario_id, 10),
      ]);
      if (!ben.length) return res.status(400).json({ error: 'Beneficiario inesistente' });

      const items = sanitizeItems(req.body.items);
      const status = req.body.status === 'finalizzata' ? 'finalizzata' : 'bozza';

      const [result] = await pool.query(
        `INSERT INTO welfare_consultazioni
          (beneficiario_id, operatore_id, nome, cognome, codice_fiscale, data_consulto, note, items, status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          parseInt(req.body.beneficiario_id, 10),
          req.user.id,
          String(req.body.nome).trim(),
          String(req.body.cognome).trim(),
          req.body.codice_fiscale ? String(req.body.codice_fiscale).trim().toUpperCase() : null,
          req.body.data_consulto,
          req.body.note ? String(req.body.note) : null,
          JSON.stringify(items),
          status,
        ]
      );

      const created = await loadConsultazione(result.insertId);
      await logAudit(req.user, 'CREATE', 'welfare_consultazioni', result.insertId, null, created, req.ip);
      res.status(201).json(created);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Errore server' });
    }
  }
);

// PUT /:id - aggiorna (solo bozza o admin/superadmin)
router.put(
  '/:id',
  authenticate,
  authorize('superadmin', 'admin', 'tutor', 'counselor'),
  async (req, res) => {
    try {
      const old = await loadConsultazione(req.params.id);
      if (!old) return res.status(404).json({ error: 'Consultazione non trovata' });

      const isAdmin = ['admin', 'superadmin'].includes(req.user.ruolo);
      if (old.status === 'finalizzata' && !isAdmin) {
        return res.status(403).json({ error: 'Consultazione finalizzata: modifica non consentita' });
      }

      const errors = validatePayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ errors });

      const updates = [];
      const values = [];
      const map = {
        beneficiario_id: (v) => parseInt(v, 10),
        nome: (v) => String(v).trim(),
        cognome: (v) => String(v).trim(),
        codice_fiscale: (v) => (v ? String(v).trim().toUpperCase() : null),
        data_consulto: (v) => v,
        note: (v) => (v == null ? null : String(v)),
        status: (v) => (v === 'finalizzata' ? 'finalizzata' : 'bozza'),
      };
      for (const [field, transform] of Object.entries(map)) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(transform(req.body[field]));
        }
      }
      if (req.body.items !== undefined) {
        updates.push('items = ?');
        values.push(JSON.stringify(sanitizeItems(req.body.items)));
      }

      if (updates.length) {
        values.push(req.params.id);
        await pool.query(
          `UPDATE welfare_consultazioni SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      const updated = await loadConsultazione(req.params.id);
      await logAudit(req.user, 'UPDATE', 'welfare_consultazioni', req.params.id, old, updated, req.ip);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Errore server' });
    }
  }
);

// DELETE /:id - soft delete
router.delete(
  '/:id',
  authenticate,
  authorize('superadmin', 'admin', 'tutor'),
  async (req, res) => {
    try {
      const old = await loadConsultazione(req.params.id);
      if (!old) return res.status(404).json({ error: 'Consultazione non trovata' });
      await pool.query(
        'UPDATE welfare_consultazioni SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [req.params.id]
      );
      await logAudit(req.user, 'DELETE', 'welfare_consultazioni', req.params.id, old, null, req.ip);
      res.json({ message: 'Consultazione eliminata' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Errore server' });
    }
  }
);

// GET /:id/pdf - genera PDF
router.get(
  '/:id/pdf',
  authenticate,
  authorize('superadmin', 'admin', 'tutor', 'counselor'),
  async (req, res) => {
    try {
      const c = await loadConsultazione(req.params.id);
      if (!c) return res.status(404).json({ error: 'Consultazione non trovata' });

      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks = [];
      doc.on('data', (b) => chunks.push(b));
      doc.on('end', () => {
        const buf = Buffer.concat(chunks);
        const safeDate = c.data_consulto
          ? new Date(c.data_consulto).toISOString().slice(0, 10)
          : 'na';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="consulto_${c.id}_${safeDate}.pdf"`
        );
        res.setHeader('Content-Length', buf.length);
        res.end(buf);
      });

      // ---- Intestazione progetto (logo + testo istituzionale)
      const today = new Date().toLocaleDateString('it-IT');
      const headerTop = 50;
      const logoSize = 70;
      const textX = LOGO_BUFFER ? 50 + logoSize + 15 : 50;
      const textWidth = 545 - textX;

      if (LOGO_BUFFER) {
        try {
          doc.image(LOGO_BUFFER, 50, headerTop, { fit: [logoSize, logoSize] });
        } catch (_) { /* ignore */ }
      }

      // Intestazione parametrizzabile via query string (ente, progetto, sottotitolo, fondo, cup)
      const defaultHeader = await getConfig();

      const header = { ...defaultHeader };
      for (const key of Object.keys(defaultHeader)) {
        if (req.query[key] !== undefined) header[key] = req.query[key];
      }

      const headerLines = [
        { text: header.ente, color: '#15803d', font: 'Helvetica-Bold', size: 11, dy: 0 },
        { text: header.progetto, color: '#111', font: 'Helvetica-Bold', size: 10, dy: 1 },
        { text: header.sottotitolo, color: '#333', font: 'Helvetica', size: 9, dy: 1 },
        { text: header.fondo, color: '#555', font: 'Helvetica', size: 8, dy: 2 },
        { text: header.cup, color: '#555', font: 'Helvetica', size: 8, dy: 1 },
      ];

      let lineY = headerTop;
      for (const line of headerLines) {
        if (!line.text) continue;
        doc.fillColor(line.color).font(line.font).fontSize(line.size)
          .text(line.text, textX, lineY + line.dy, { width: textWidth });
        lineY = doc.y;
      }

      // Allinea cursore sotto il blocco intestazione
      const headerBottom = Math.max(doc.y, headerTop + logoSize);
      doc.y = headerBottom + 8;
      doc.x = 50;

      // Linea divisoria + data stampa
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#15803d').lineWidth(1).stroke();
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(9).fillColor('#666')
        .text(`Data di stampa: ${today}`, 50, doc.y, { align: 'right', width: 495 });
      doc.moveDown(0.8);

      // Titolo documento
      doc.fillColor('#111').font('Helvetica-Bold').fontSize(15)
        .text('Registro Consultazioni Welfare', 50, doc.y, { align: 'left' });
      doc.font('Helvetica').fontSize(11).fillColor('#444').text(
        `Consulto n. ${c.id} — Status: ${c.status === 'finalizzata' ? 'Finalizzata' : 'Bozza'}`
      );
      doc.moveDown(0.8);

      // ---- Dati beneficiario
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#15803d').text('Beneficiario');
      doc.font('Helvetica');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#111');
      doc.text(`Nome: ${c.nome || '-'}`);
      doc.text(`Cognome: ${c.cognome || '-'}`);
      doc.text(`Codice Fiscale: ${c.codice_fiscale || '-'}`);
      doc.text(
        `Data consulto: ${
          c.data_consulto ? new Date(c.data_consulto).toLocaleDateString('it-IT') : '-'
        }`
      );
      if (c.beneficiario_codice_id) doc.text(`Codice ID interno: ${c.beneficiario_codice_id}`);
      doc.moveDown(0.8);

      // ---- Operatore
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#15803d').text('Operatore');
      doc.font('Helvetica');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#111');
      const opName = [c.operatore_nome, c.operatore_cognome].filter(Boolean).join(' ') || '-';
      doc.text(`Nome: ${opName}`);
      if (c.operatore_email) doc.text(`Email: ${c.operatore_email}`);
      doc.moveDown(0.8);

      // ---- Items
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#15803d').text('Informazioni Welfare');
      doc.font('Helvetica');
      doc.moveDown(0.3);
      const items = Array.isArray(c.items) ? c.items : [];
      if (!items.length) {
        doc.fontSize(11).fillColor('#666').text('Nessuna voce inserita.');
      } else {
        items.forEach((it, i) => {
          if (doc.y > 720) doc.addPage();
          doc.fontSize(11).fillColor('#111').text(`${i + 1}. ${it.titolo || '(senza titolo)'}`, {
            continued: false,
          });
          if (it.categoria) {
            doc.fontSize(9).fillColor('#15803d').text(`Categoria: ${it.categoria}`);
          }
          if (it.contenuto) {
            doc.fontSize(10).fillColor('#333').text(it.contenuto, { align: 'justify' });
          }
          if (it.fonte) {
            doc.fontSize(9).fillColor('#777').text(`Fonte: ${it.fonte}`);
          }
          doc.moveDown(0.5);
        });
      }
      doc.moveDown(0.5);

      // ---- Note
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#15803d').text('Note');
      doc.font('Helvetica');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#111').text(c.note ? String(c.note) : '—', { align: 'justify' });

      // ---- Footer per ogni pagina
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const bottom = doc.page.height - 40;
        doc.fontSize(8).fillColor('#888');
        doc.text(
          `Documento generato da fami-integra`,
          50,
          bottom,
          { align: 'left', lineBreak: false }
        );
        doc.text(
          `Pagina ${i + 1} di ${range.count}`,
          50,
          bottom,
          { align: 'right', lineBreak: false, width: doc.page.width - 100 }
        );
      }

      doc.end();
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'Errore generazione PDF' });
    }
  }
);

module.exports = router;
