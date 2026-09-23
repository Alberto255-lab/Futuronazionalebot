# Gestione Bot

Bot Telegram + pannello di amministrazione web per gestire propaganda, eventi,
collaborazioni, reminder e candidature.

**Scelte fatte per tenerlo semplice:**
- Database: **SQLite** (un singolo file, nessun server da installare/configurare — niente Postgres, niente password di database).
- Nessun Docker: si avvia con `npm install` + `npm run dev`, punto.
- Login: solo Telegram Login Widget, nessuna password da gestire.

---

## 1. Prerequisiti

- [Node.js](https://nodejs.org) versione 20 o superiore installato sul computer.
- Un account Telegram.

---

## 2. Creare il bot con BotFather

1. Apri Telegram e cerca **@BotFather**.
2. Scrivi `/newbot` e segui le istruzioni (ti chiederà un nome e uno username, es. `gestionebot_bot`).
3. Alla fine BotFather ti darà un **token** tipo `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`. Questo va nella variabile `BOT_TOKEN`.

## 3. Impostare /setdomain (necessario per il Login Widget)

Il Telegram Login Widget funziona solo se il bot "conosce" il dominio da cui verrà usato:

1. Scrivi a **@BotFather** → `/setdomain`
2. Scegli il tuo bot
3. Scrivi il dominio dove sarà online il pannello (es. `gestione-bot.vercel.app`, **senza** `https://` e senza slash finale)

Se in futuro cambi dominio, ripeti questo passaggio con il nuovo dominio.

## 4. Ottenere il tuo ID Telegram personale

1. Cerca **@userinfobot** su Telegram
2. Scrivigli `/start`
3. Ti risponderà con il tuo ID numerico (es. `5513514802`) — questo va in `ALLOWED_ADMIN_IDS`

---

## 5. Avvio in locale

### Backend

```bash
cd backend
cp .env.example .env
# apri .env e inserisci BOT_TOKEN, ALLOWED_ADMIN_IDS, JWT_SECRET (una stringa lunga a caso)
npm install
npm run dev
```

Il server parte su `http://localhost:3000` e il bot si connette a Telegram automaticamente (long polling, non serve nessun URL pubblico in locale).

### Frontend

In un altro terminale:

```bash
cd frontend
cp .env.example .env
# apri .env e inserisci VITE_BOT_USERNAME (lo username del tuo bot, senza @)
npm install
npm run dev
```

Il pannello si apre su `http://localhost:5173`.

## 6. Accedere al pannello

1. Apri `http://localhost:5173`
2. Clicca "Accedi con Telegram" e conferma nell'app Telegram
3. Se il tuo ID è nella variabile `ALLOWED_ADMIN_IDS` del backend, entri nel pannello

---

## 7. Comandi del bot

| Comando | Dove | Cosa fa |
|---|---|---|
| `/start` | privato | messaggio di benvenuto, registra l'utente |
| `/setpropaganda` | dentro un topic di un gruppo | imposta quel topic come "topic propaganda" |
| `/convertmoduli` | nel gruppo | converte i moduli tesseramento della settimana scorsa (lun-dom) |
| `/proponi Titolo \| Descrizione \| Budget` | ovunque | crea un evento in attesa di approvazione |
| `/setchannel nomegruppo` | nel gruppo da registrare | registra il gruppo come canale con quel nome |
| `/inoltra nomegruppo` | in risposta a un messaggio | copia il messaggio nel canale registrato |
| `/candidatura` | privato | avvia il questionario di candidatura |

**Nota importante:** un bot Telegram non può leggere messaggi scritti *prima* di essere stato aggiunto al gruppo o riavviato — può solo ricevere quelli nuovi. Per questo `/convertmoduli` funziona sui messaggi che il bot ha "visto" e salvato nel frattempo, non su una cronologia generica.

---

## 8. Broadcast in privato (nuova funzione)

Nella sezione **Reminders** del pannello, quando crei un Alert puoi scegliere tra due tipi:

- **📢 Canali/gruppi** — il messaggio classico, inviato ai canali che selezioni
- **💬 DM a tutti gli utenti** — il messaggio viene inviato in chat privata a **tutte le persone che hanno scritto `/start` al bot**

Funziona esattamente come i reminder normali (stesso sistema di intervallo, stesso pulsante Start/Stop), cambia solo dove arriva il messaggio.

---

## 9. Come hostarlo online GRATIS (deploy a costo zero)

Premessa onesta: **Vercel da solo non è adatto al backend.** Vercel fa girare funzioni "serverless" che si accendono e si spengono in pochi secondi, mentre il bot deve restare **sempre acceso** (ascolto continuo di Telegram + controllo dei reminder ogni minuto).

Soluzione a costo zero, senza carta di credito:

- **Frontend → Vercel** (gratuito per sempre, è un sito statico)
- **Backend → Render**, piano Free (gratuito, nessuna carta richiesta)

Render Free però ha un comportamento da conoscere: se il servizio non riceve richieste per 15 minuti si "addormenta", e quando si riaddormenta/riavvia **cancella i file scritti su disco** — quindi perderesti il database SQLite. Per questo il progetto include un **job "keep-alive"**: ogni 10 minuti il backend chiama da solo il proprio indirizzo pubblico, così Render lo considera sempre attivo e non lo mette mai a dormire. Non devi configurare nulla: parte da solo appena il progetto gira su Render (in locale resta disattivato automaticamente).

⚠️ Unico scenario in cui i dati si azzerano comunque: se fai un nuovo deploy (es. carichi codice nuovo) o se Render riavvia il servizio per manutenzione. Per un progetto personale è un compromesso accettabile; se in futuro vuoi eliminare anche questo rischio, si può spostare il database su un servizio esterno gratuito (es. Turso) — fammelo sapere.

### 9.1 Backend su Render

> **Nota:** il progetto è impostato per usare Node.js 20 (file `.node-version` dentro `backend/`). Il Build Command usa `npm ci` (non `npm install`) apposta: `npm ci` reinstalla sempre tutto da zero invece di fidarsi della cache di Render, evitando che il modulo del database (`better-sqlite3`) resti compilato per una versione di Node diversa da quella in uso — è la causa più comune di crash tipo `NODE_MODULE_VERSION` o `Assertion failed`. Se dovesse ricapitare comunque, su Render usa "Manual Deploy" → "Clear build cache & deploy".

1. Vai su [render.com](https://render.com) e crea un account (va bene GitHub, non chiede carta di credito)
2. Carica il progetto su GitHub (crea una repo e fai push di tutta la cartella `gestione-bot`)
3. Su Render: "New" → "Web Service" → seleziona la repo
4. Root Directory: `backend`
5. Runtime: Node
6. Build Command: `npm ci && npm run build`
7. Start Command: `npm start`
8. Instance Type: **Free**
9. In "Environment" aggiungi le stesse variabili del tuo `.env`: `BOT_TOKEN`, `ALLOWED_ADMIN_IDS`, `JWT_SECRET`, `DATABASE_FILE=./data/gestione-bot.db`, e `FRONTEND_URL` (l'URL del sito su Vercel — lo aggiungi dopo aver fatto anche quel deploy)
10. Deploy. Render ti darà un URL tipo `https://gestione-bot-backend.onrender.com` — questo è il tuo `VITE_API_URL`

### 9.2 Frontend su Vercel

1. Vai su [vercel.com](https://vercel.com) e crea un account (GitHub va benissimo)
2. "Add New Project" → seleziona la stessa repo
3. Imposta "Root Directory" su `frontend`
4. Framework preset: Vite (Vercel lo riconosce da solo)
5. Nelle Environment Variables aggiungi:
   - `VITE_API_URL` = l'URL del backend che hai ottenuto da Railway (es. `https://gestione-bot-backend.up.railway.app`)
   - `VITE_BOT_USERNAME` = lo username del tuo bot, senza @
6. Deploy. Vercel ti darà un dominio tipo `gestione-bot.vercel.app`

### 9.3 Ultimi due collegamenti da fare

1. Torna su **BotFather** → `/setdomain` → inserisci il dominio Vercel (es. `gestione-bot.vercel.app`)
2. Torna su **Render** → variabile `FRONTEND_URL` → mettici l'URL completo del sito Vercel (es. `https://gestione-bot.vercel.app`), serve per il CORS (senza questo il backend rifiuta le richieste del sito)

Fatto: bot online 24/7 gratis su Render (tenuto sveglio dal job keep-alive), pannello online gratis su Vercel. Costo totale: **0€**.

---

## 10. Struttura del progetto

```
gestione-bot/
├── backend/     → bot Telegram + API (Node/Express/TypeScript/SQLite)
└── frontend/    → pannello admin (React/Vite/Tailwind)
```
