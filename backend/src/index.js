require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const beneficiariRoutes = require('./routes/beneficiari');
const alloggiRoutes = require('./routes/alloggi');
const aziendeRoutes = require('./routes/aziende');
const matchingRoutes = require('./routes/matching');
const dashboardRoutes = require('./routes/dashboard');
const utentiRoutes = require('./routes/utenti');
const importRoutes = require('./routes/importExport');
const auditRoutes = require('./routes/audit');
const contrattiRoutes = require('./routes/contratti');
const fotoAlloggiRoutes = require('./routes/fotoAlloggi');
const geocodingRoutes = require('./routes/geocoding');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: function(origin, callback) {
    // Accetta richieste senza origin (es. curl, server-side) e qualsiasi origin configurato
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      // In produzione accetta comunque per evitare problemi con IP dinamici
      callback(null, true);
    }
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Troppe richieste, riprova tra 15 minuti' }
});
app.use('/api/auth/login', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/beneficiari', beneficiariRoutes);
app.use('/api/alloggi', alloggiRoutes);
app.use('/api/aziende', aziendeRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/utenti', utentiRoutes);
app.use('/api/import', importRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/contratti', contrattiRoutes);
app.use('/api/foto-alloggi', fotoAlloggiRoutes);
app.use('/api/geocoding', geocodingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Errore interno del server'
      : err.message
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FAMI INTEGRA Backend avviato su 0.0.0.0:${PORT}`);
  });
}

module.exports = app;
