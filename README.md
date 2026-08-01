<div align="center">

# 🌍 FAMI INTEGRA

### Piattaforma per Centri Sportello e Percorsi di Autonomia

**Dal dato all'autonomia reale.** Una banca dati intelligente che collega i beneficiari in uscita dai progetti SAI ad alloggi disponibili e opportunità di lavoro sul territorio.

![Node](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Next](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-utf8mb4-003545?style=flat-square&logo=mariadb&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-cluster-2B037A?style=flat-square&logo=pm2&logoColor=white)
![Distribuzione](https://img.shields.io/badge/Distribuzione-Gratuita-brightgreen?style=flat-square)

</div>

---

## 💡 L'idea

FAMI INTEGRA nasce da un'intuizione di **Giovanni Campese**, ex sindaco di **Monteleone di Puglia**, uno dei borghi dell'Appennino Dauno che ha fatto dell'accoglienza una leva concreta di rigenerazione territoriale.

L'osservazione di partenza è semplice ma decisiva: **il momento più fragile del percorso di integrazione non è l'accoglienza, è l'uscita.** Quando un beneficiario esce da un progetto SAI, le informazioni su di lui — competenze, nucleo familiare, comune di riferimento, data di uscita — sono già tutte disponibili. Ciò che manca è uno strumento che le metta *in relazione* con le opportunità reali del territorio: case sfitte, aziende che cercano personale, servizi welfare attivabili.

Da questa idea è nata la piattaforma, sviluppata da **[paki81](https://github.com/paki81)** come strumento operativo e non come semplice archivio: un motore che **suggerisce** abbinamenti, li **misura** con un punteggio e li **traccia** nel tempo.

### 🎁 Distribuzione gratuita

FAMI INTEGRA è pensata per essere **distribuita gratuitamente** a enti locali, cooperative sociali ed enti gestori attraverso il canale istituzionale del Fondo Asilo Migrazione e Integrazione:

> 🔗 **[fami.dlci.interno.gov.it](https://fami.dlci.interno.gov.it)**

L'obiettivo è che nessun ente debba ripartire da zero. La piattaforma è **interamente personalizzabile** — nome, logo, ente, testi dei documenti, server email — direttamente dal pannello **Strumenti**, senza toccare una riga di codice.

---

## ✨ Cosa fa

| | Funzionalità | Descrizione |
|:-:|---|---|
| 🏠 | **Matching Alloggi** | Suggerimenti automatici con score 0-100 su vani, comune, disponibilità e tipologia |
| 💼 | **Matching Lavoro** | Abbinamento beneficiario-azienda su competenze, comune, tirocinio e orario |
| 👥 | **Anagrafica Beneficiari** | Schede complete, nucleo familiare, competenze, date di uscita SAI |
| 🗺️ | **Geolocalizzazione** | Mappe Leaflet con geocoding automatico degli indirizzi |
| 📸 | **Galleria Foto** | Documentazione fotografica degli alloggi |
| 📋 | **Registro Note** | Diario di bordo per beneficiari, alloggi e aziende |
| 🤝 | **Servizi Welfare** | Consultazioni welfare con generazione PDF personalizzata |
| 📊 | **Dashboard & Report** | Statistiche in tempo reale, uscite imminenti, matching recenti |
| 📥 | **Import / Export** | Excel in ingresso, XLSX e CSV in uscita |
| 🔐 | **RBAC + Audit Log** | 5 ruoli con permessi granulari e tracciamento completo delle azioni |
| 🛠️ | **Strumenti** | Backup DB, personalizzazione branding, configurazione SMTP |

---

## 🧱 Stack tecnologico

| Livello | Tecnologia |
|---|---|
| **Backend** | Node.js + Express, JWT auth, RBAC |
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| **Database** | MariaDB (utf8mb4) |
| **Mappe** | Leaflet + geocoding Nominatim |
| **PDF** | Generazione server-side con branding dinamico |
| **Email** | Nodemailer con configurazione SMTP da pannello |
| **Process Manager** | PM2 (cluster mode) |

---

## 🚀 Avvio rapido

### 1. Prerequisiti

```bash
node -v            # >= 18
mysql --version    # MariaDB 10.4+
npm i -g pm2
```

### 2. Database

```bash
mysql -e "CREATE DATABASE fami_integra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql fami_integra < backend/migrations/001_schema.sql
mysql fami_integra < backend/migrations/002_seed.sql
mysql fami_integra < backend/migrations/003_welfare_consultazioni.sql
```

### 3. Backend

```bash
cd backend
npm install
npm start
```

Contenuto minimo di `backend/.env`:

```env
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fami_integra
JWT_SECRET=cambia-questa-stringa-con-una-casuale-molto-lunga
FRONTEND_URL=http://localhost:3000
```

> 💡 **Le credenziali SMTP non servono nel `.env`**: si configurano dall'interfaccia in **Strumenti → Server Email (SMTP)**.

### 4. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local
npm run build
npm start
```

### 5. Produzione con PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Apri il browser su `http://localhost:3000` e accedi con le credenziali di default.

---

## 👤 Credenziali di default

| Ruolo | Email | Password |
|-------|-------|----------|
| SuperAdmin | admin@fami-integra.it | admin123 |
| Tutor | tutor.casa@fami-integra.it | admin123 |
| Counselor | counselor.lavoro@fami-integra.it | admin123 |
| Viewer | viewer@fami-integra.it | admin123 |

> 🔴 **Prima cosa da fare in produzione:** cambiare tutte le password e sostituire il `JWT_SECRET`.

---

## 🎨 Personalizzazione senza codice

Accedi come **SuperAdmin** e apri **Strumenti**. Tutto quello che segue è modificabile dall'interfaccia.

### Identità visiva

| Campo | Dove compare |
|---|---|
| **Logo** | Login, sidebar, intestazione dei PDF |
| **Nome App** | Titolo del login, header e oggetto delle email |
| **Slogan** | Sottotitolo del login e delle email |
| **Organizzazione** | Footer delle email |
| **URL Portale** | Link nelle email di notifica |

Il logo si carica con **Carica Logo** (PNG o JPG) e si può rimuovere con **Rimuovi** per tornare a quello di default.

### Intestazione dei documenti PDF

| Campo | Esempio |
|---|---|
| **Ente** | `COMUNE DI ...` |
| **Progetto** | `PROGETTO "INTEGRA_Azioni"` |
| **Sottotitolo** | Descrizione estesa del progetto |
| **Fondo** | `FONDO ASILO MIGRAZIONE E INTEGRAZIONE (FAMI) 2021-2027` |
| **CUP** | Codice unico di progetto |

### Server email (SMTP)

Host, porta, connessione sicura, utente, password e indirizzo mittente si impostano da **Strumenti → Server Email (SMTP)**.

| Provider | Host | Porta | Sicura |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` | No (STARTTLS) |
| Outlook / M365 | `smtp.office365.com` | `587` | No (STARTTLS) |
| SMTP generico SSL | *host del provider* | `465` | Sì (SSL) |

> ⚠️ Con **Gmail** serve una **App Password** generata dall'account Google, non la password di login.

---

## 🔐 Ruoli e permessi (RBAC)

| Ruolo | Dashboard | Beneficiari | Alloggi | Aziende | Matching | Import | Utenti | Strumenti |
|-------|:---------:|-------------|---------|---------|----------|:------:|--------|:---------:|
| **SuperAdmin** | ✅ | CRUD + Delete | CRUD + Delete | CRUD + Delete | Tutti | ✅ | CRUD | ✅ |
| **Admin** | ✅ | CRUD + Delete | CRUD + Delete | CRUD + Delete | Tutti | ✅ | Lettura | ❌ |
| **Tutor** | ✅ | CRUD (propri) | CRUD | Lettura | Alloggi | ❌ | ❌ | ❌ |
| **Counselor** | ✅ | CRUD (propri) | Lettura | CRUD | Lavoro | ❌ | ❌ | ❌ |
| **Viewer** | ✅ | Lettura | Lettura | Lettura | ❌ | ❌ | ❌ | ❌ |

---

## 🧮 Come funziona il matching

Il motore assegna a ogni abbinamento un punteggio da **0 a 100**: più alto, più l'abbinamento è coerente.

### 🏠 Alloggi

| Criterio | Punti | Logica |
|---|:---:|---|
| **Vani** | +40 | `N_Vani >= N_Componenti × 0.5` (un vano ogni due persone) |
| **Comune** | +30 | Stesso comune del beneficiario |
| **Disponibilità** | +20 | Alloggio libero prima della data di uscita dal SAI |
| **Tipologia** | +10 | Adeguata al nucleo (es. appartamento per famiglie) |

### 💼 Aziende

| Criterio | Punti | Logica |
|---|:---:|---|
| **Competenze** | +30 | Match tra competenze del beneficiario e mansione richiesta |
| **Comune** | +30 | Stesso comune |
| **Disponibilità** | +20 | Azienda attualmente disponibile |
| **Tirocinio** | +10 | Bonus se l'azienda accetta tirocini |
| **Orario** | +10 | Full-time preferito |

---

## 🗂️ Struttura del progetto

```
fami-integra/
├── backend/
│   ├── src/
│   │   ├── index.js                    # Server Express
│   │   ├── models/db.js                # Pool connessione MariaDB
│   │   ├── middleware/auth.js          # JWT + RBAC
│   │   ├── routes/
│   │   │   ├── auth.js                 # Login, me, reset password
│   │   │   ├── beneficiari.js          # CRUD beneficiari
│   │   │   ├── alloggi.js              # CRUD alloggi
│   │   │   ├── aziende.js              # CRUD aziende
│   │   │   ├── comuni.js               # Anagrafica comuni
│   │   │   ├── comuniProgetto.js       # Comuni aderenti al progetto
│   │   │   ├── matching.js             # Suggerimenti + creazione matching
│   │   │   ├── dashboard.js            # Statistiche
│   │   │   ├── utenti.js               # Gestione utenti
│   │   │   ├── importExport.js         # Import Excel / Export CSV-XLSX
│   │   │   ├── audit.js                # Audit log
│   │   │   ├── contratti.js            # Monitoraggio contratti
│   │   │   ├── fotoAlloggi.js          # Galleria fotografica
│   │   │   ├── geocoding.js            # Geocoding indirizzi
│   │   │   ├── registroNote.js         # Registro note
│   │   │   ├── serviziWelfare.js       # Catalogo servizi welfare
│   │   │   ├── consultazioniWelfare.js # Consultazioni + PDF
│   │   │   ├── config.js               # Configurazione e branding
│   │   │   └── strumenti.js            # Backup, logo, config protetta
│   │   ├── services/
│   │   │   └── matchingEngine.js       # Algoritmo di matching
│   │   └── utils/
│   │       ├── auditLog.js             # Logger audit
│   │       └── mailer.js               # Invio email + template
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_seed.sql
│   │   └── 003_welfare_consultazioni.sql
│   └── tests/
│       └── matching.test.js            # Test motore di matching
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   └── (protected)/
│       │       ├── dashboard/
│       │       ├── beneficiari/
│       │       ├── alloggi/
│       │       ├── aziende/
│       │       ├── comuni/
│       │       ├── matching/
│       │       ├── servizi-welfare/
│       │       ├── report/
│       │       ├── import/
│       │       ├── utenti/
│       │       └── strumenti/
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── MappaLeaflet.tsx
│       │   ├── GalleriaFoto.tsx
│       │   ├── RegistroNote.tsx
│       │   └── ui/
│       ├── contexts/AuthContext.tsx
│       └── lib/api.ts
├── ecosystem.config.js
└── README.md
```

---

## 🛠️ Guide operative

### Importare i dati da Excel

1. Vai su **Import / Export**
2. Scegli la tabella di destinazione (beneficiari, alloggi, aziende)
3. Carica il file `.xlsx`: le intestazioni delle colonne devono corrispondere ai campi della tabella
4. Verifica il report di importazione (righe inserite / scartate)

### Creare un matching

1. Apri la scheda di un **beneficiario**
2. Vai su **Matching** e scegli *Alloggi* o *Lavoro*
3. La piattaforma mostra i candidati ordinati per punteggio
4. Clicca **Crea matching** sull'opzione scelta: l'abbinamento viene registrato e tracciato

### Generare un PDF di consultazione welfare

1. **Servizi Welfare → Consultazioni → Nuova**
2. Compila la consultazione e salva
3. Dalla scheda della consultazione usa **Scarica PDF**
4. L'intestazione del PDF usa automaticamente logo e testi impostati in **Strumenti**

### Eseguire un backup del database

1. **Strumenti → Backup**
2. Clicca **Crea backup**: viene generato un dump scaricabile
3. I backup precedenti restano elencati e scaricabili in qualsiasi momento

### Recuperare una password dimenticata

1. Dalla pagina di login clicca **Password dimenticata?**
2. Inserisci l'email dell'account
3. Arriva un'email con un link valido **1 ora**

> Se l'invio restituisce errore, controlla la configurazione in **Strumenti → Server Email (SMTP)**.

---

## ⚙️ Comandi utili

### PM2

```bash
pm2 list                                   # Stato dei servizi
pm2 restart fami-backend fami-frontend     # Riavvio
pm2 logs fami-backend                      # Log in tempo reale
pm2 stop fami-backend fami-frontend        # Stop
pm2 save                                   # Salva configurazione
```

### Sviluppo

```bash
# Test del motore di matching
cd backend && npx jest --coverage

# Rebuild frontend dopo modifiche
cd frontend && npm run build && pm2 restart fami-frontend

# Reimportare lo schema del DB
mysql fami_integra < backend/migrations/001_schema.sql
```

---

## 🔌 API principali

Tutte le rotte protette richiedono l'header `Authorization: Bearer <token>`.

### Autenticazione

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Utente corrente |
| `POST` | `/api/auth/change-password` | Cambio password |
| `POST` | `/api/auth/forgot-password` | Richiesta reset |
| `POST` | `/api/auth/reset-password` | Conferma reset |

### Anagrafiche

| Metodo | Endpoint |
|---|---|
| `GET` / `POST` | `/api/beneficiari` |
| `GET` / `PUT` / `DELETE` | `/api/beneficiari/:id` |
| `GET` / `POST` | `/api/alloggi` |
| `GET` / `PUT` / `DELETE` | `/api/alloggi/:id` |
| `GET` / `POST` | `/api/aziende` |
| `GET` / `PUT` / `DELETE` | `/api/aziende/:id` |

### Matching

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/matching/suggerisci-alloggi/:idBen` | Suggerimenti alloggi |
| `GET` | `/api/matching/suggerisci-aziende/:idBen` | Suggerimenti aziende |
| `POST` | `/api/matching/alloggi` | Crea matching alloggio |
| `POST` | `/api/matching/lavoro` | Crea matching lavoro |

### Dashboard

| Metodo | Endpoint |
|---|---|
| `GET` | `/api/dashboard/stats` |
| `GET` | `/api/dashboard/beneficiari-per-comune` |
| `GET` | `/api/dashboard/uscite-prossime` |
| `GET` | `/api/dashboard/matching-recenti` |

### Import / Export

| Metodo | Endpoint | Note |
|---|---|---|
| `POST` | `/api/import/beneficiari` | `multipart/form-data` |
| `POST` | `/api/import/alloggi` | `multipart/form-data` |
| `POST` | `/api/import/aziende` | `multipart/form-data` |
| `GET` | `/api/import/export/:tabella` | XLSX |
| `GET` | `/api/import/export-csv/:tabella` | CSV |

### Configurazione e branding

| Metodo | Endpoint | Accesso |
|---|---|---|
| `GET` | `/api/config` | Pubblico |
| `GET` | `/api/config/logo` | Pubblico |
| `GET` / `PUT` | `/api/strumenti/config` | SuperAdmin |
| `POST` / `DELETE` | `/api/strumenti/logo` | SuperAdmin |

---

## 🐞 Risoluzione problemi

| Sintomo | Causa probabile | Soluzione |
|---|---|---|
| **502 Bad Gateway** | Backend non avviato | `pm2 restart fami-backend` e controlla `pm2 logs fami-backend` |
| **500 su reset password** | Credenziali SMTP errate | Verifica **Strumenti → Server Email**; con Gmail serve una App Password |
| **Logo non aggiornato** | Cache del browser | Ricarica con `Ctrl+Shift+R` |
| **Mappa vuota** | Indirizzi non geocodificati | Salva di nuovo la scheda per rilanciare il geocoding |
| **Login rifiutato** | Password cambiata o token scaduto | Usa **Password dimenticata?** |

---

## 🤝 Crediti

- **Idea originale**: Giovanni Campese, ex sindaco di Monteleone di Puglia
- **Sviluppo**: [paki81](https://github.com/paki81)
- **Distribuzione**: gratuita tramite [fami.dlci.interno.gov.it](https://fami.dlci.interno.gov.it)

<div align="center">

**Realizzato nell'ambito del Fondo Asilo Migrazione e Integrazione (FAMI) 2021-2027**

</div>
