# FAMI INTEGRA - Piattaforma Centro Sportello

Piattaforma web per il progetto FAMI (Fondo Asilo Migrazione Integrazione) - Cooperativa Sociale Aladino PROG-705.

Banca dati per matching di potenziali beneficiari in uscita da progetti SAI verso alloggi disponibili (WP3) e opportunità lavorative (WP4).

## Stack Tecnologico

- **Backend**: Node.js + Express, JWT auth, RBAC
- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui
- **Database**: MariaDB (utf8mb4)
- **Process Manager**: PM2

## Servizi attivi

| Servizio | Porta | URL |
|----------|-------|-----|
| Frontend | 3000 | http://192.168.188.163:3000 |
| Backend API | 4000 | http://192.168.188.163:4000/api |

## Credenziali di default

| Ruolo | Email | Password |
|-------|-------|----------|
| SuperAdmin | admin@fami-integra.it | admin123 |
| Tutor | tutor.casa@fami-integra.it | admin123 |
| Counselor | counselor.lavoro@fami-integra.it | admin123 |
| Viewer | viewer@fami-integra.it | admin123 |

> **IMPORTANTE**: Cambiare le password al primo accesso!

## Struttura Progetto

```
fami-integra/
├── backend/
│   ├── src/
│   │   ├── index.js              # Server Express
│   │   ├── models/db.js          # Pool connessione MariaDB
│   │   ├── middleware/auth.js     # JWT + RBAC middleware
│   │   ├── routes/               # Tutte le API route
│   │   │   ├── auth.js           # Login, me, change-password
│   │   │   ├── beneficiari.js    # CRUD beneficiari
│   │   │   ├── alloggi.js        # CRUD alloggi
│   │   │   ├── aziende.js        # CRUD aziende
│   │   │   ├── matching.js       # Suggerimenti + crea matching
│   │   │   ├── dashboard.js      # Statistiche
│   │   │   ├── utenti.js         # Gestione utenti (SuperAdmin)
│   │   │   ├── importExport.js   # Import Excel / Export CSV-XLSX
│   │   │   ├── audit.js          # Audit log
│   │   │   └── contratti.js      # Monitoraggio contratti
│   │   ├── services/
│   │   │   └── matchingEngine.js # Algoritmo matching con score
│   │   └── utils/
│   │       └── auditLog.js       # Logger audit
│   ├── migrations/
│   │   ├── 001_schema.sql        # Schema DB MariaDB
│   │   └── 002_seed.sql          # Dati di esempio
│   ├── tests/
│   │   └── matching.test.js      # 12 test, 97% coverage
│   ├── .env                      # Configurazione backend
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/            # Pagina login
│   │   │   └── (protected)/      # Pagine protette
│   │   │       ├── dashboard/    # Dashboard statistiche
│   │   │       ├── beneficiari/  # CRUD beneficiari
│   │   │       ├── alloggi/      # CRUD alloggi
│   │   │       ├── aziende/      # CRUD aziende
│   │   │       ├── matching/     # Matching automatico
│   │   │       ├── report/       # Report e monitoraggio
│   │   │       ├── import/       # Import Excel / Export
│   │   │       └── utenti/       # Gestione utenti
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Navigazione sidebar
│   │   │   └── ui/               # Componenti UI (button, card, input, badge)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # Contesto autenticazione
│   │   └── lib/
│   │       ├── api.ts            # Client API Axios
│   │       └── utils.ts          # Utility (format, colori, cn)
│   ├── .env.local                # URL API
│   └── package.json
├── ecosystem.config.js           # Configurazione PM2
├── docker-compose.yml            # (opzionale) Deploy con Docker
└── README.md
```

## Ruoli RBAC

| Ruolo | Dashboard | Beneficiari | Alloggi | Aziende | Matching | Import | Utenti |
|-------|-----------|-------------|---------|---------|----------|--------|--------|
| SuperAdmin | ✅ | CRUD + Delete | CRUD + Delete | CRUD + Delete | Tutti | ✅ | CRUD |
| Admin | ✅ | CRUD + Delete | CRUD + Delete | CRUD + Delete | Tutti | ✅ | Lettura |
| Tutor | ✅ | CRUD (propri) | CRUD | Lettura | Alloggi | ❌ | ❌ |
| Counselor | ✅ | CRUD (propri) | Lettura | CRUD | Lavoro | ❌ | ❌ |
| Viewer | ✅ | Lettura | Lettura | Lettura | ❌ | ❌ | ❌ |

## Algoritmo Matching

### Matching Alloggi (score 0-100)
- **Vani** (+40pt): `N_Vani >= N_Componenti * 0.5` (1 vano per 2 persone)
- **Comune** (+30pt): stesso comune del beneficiario
- **Disponibilità** (+20pt): disponibile prima della data uscita SAI
- **Tipologia** (+10pt): adeguata al nucleo (es. appartamento per famiglie)

### Matching Aziende (score 0-100)
- **Disponibilità** (+20pt): azienda disponibile
- **Comune** (+30pt): stesso comune
- **Competenze** (+30pt): match tra competenze beneficiario e mansione
- **Tirocinio** (+10pt): bonus se disponibile
- **Orario** (+10pt): full-time preferito

## Comandi PM2

```bash
# Stato servizi
pm2 list

# Riavvia tutto
pm2 restart fami-backend fami-frontend

# Log in tempo reale
pm2 logs fami-backend
pm2 logs fami-frontend

# Stop
pm2 stop fami-backend fami-frontend

# Avvio da ecosystem
pm2 start /var/www/html/integra/fami-integra/ecosystem.config.js

# Salva configurazione
pm2 save
```

## Comandi Utili

```bash
# Test matching engine
cd /var/www/html/integra/fami-integra/backend && npx jest --coverage

# Rebuild frontend dopo modifiche
cd /var/www/html/integra/fami-integra/frontend && npm run build && pm2 restart fami-frontend

# Reimportare schema DB
mysql fami_integra < backend/migrations/001_schema.sql

# Reimportare dati seed
mysql fami_integra < backend/migrations/002_seed.sql
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Utente corrente
- `POST /api/auth/change-password` - Cambio password

### CRUD (tutti richiedono Bearer token)
- `GET/POST /api/beneficiari` - Lista / Crea
- `GET/PUT/DELETE /api/beneficiari/:id`
- `GET/POST /api/alloggi`
- `GET/PUT/DELETE /api/alloggi/:id`
- `GET/POST /api/aziende`
- `GET/PUT/DELETE /api/aziende/:id`

### Matching
- `GET /api/matching/suggerisci-alloggi/:idBen` - Suggerimenti alloggi
- `GET /api/matching/suggerisci-aziende/:idBen` - Suggerimenti aziende
- `POST /api/matching/alloggi` - Crea matching alloggio
- `POST /api/matching/lavoro` - Crea matching lavoro

### Dashboard & Report
- `GET /api/dashboard/stats`
- `GET /api/dashboard/beneficiari-per-comune`
- `GET /api/dashboard/uscite-prossime`

### Import/Export
- `POST /api/import/beneficiari` (multipart/form-data)
- `POST /api/import/alloggi`
- `POST /api/import/aziende`
- `GET /api/import/export/:tabella` (xlsx)
- `GET /api/import/export-csv/:tabella` (csv)
