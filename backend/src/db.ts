// db.ts
// Gestione del database SQLite. Uso SQLite invece di Postgres perché non richiede
// nessun server esterno da installare/configurare: è un singolo file sul disco.
// Al primo avvio, se il file non esiste, viene creato con tutte le tabelle.

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_FILE = process.env.DATABASE_FILE || "./data/gestione-bot.db";

// Mi assicuro che la cartella del database esista
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Creazione di tutte le tabelle (se non esistono già)
db.exec(`
CREATE TABLE IF NOT EXISTS site_admins (
  telegram_id INTEGER PRIMARY KEY,
  added_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  telegram_chat_id INTEGER PRIMARY KEY,
  title TEXT,
  added_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS group_member_permissions (
  member_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (member_id, permission_id)
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  telegram_chat_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS propaganda_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL
);

-- Salva ogni messaggio scritto nel topic "propaganda" mano a mano che arriva.
-- Serve perché un bot Telegram NON può leggere i messaggi passati di una chat,
-- può solo "ascoltare" quelli nuovi: quindi li accumuliamo qui e /convertmoduli
-- li legge da questa tabella invece che da Telegram direttamente.
CREATE TABLE IF NOT EXISTS propaganda_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  testo TEXT NOT NULL,
  data TEXT NOT NULL,
  convertito INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS propaganda_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  stipendio INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tesseramenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propagandista_id INTEGER,
  propagandista_username TEXT,
  tesserato_nome TEXT,
  tesserato_telegram TEXT,
  ruolo_id INTEGER,
  conta_stipendio INTEGER NOT NULL DEFAULT 0,
  settimana TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titolo TEXT NOT NULL,
  descrizione TEXT,
  budget INTEGER,
  stato TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collaborations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_azienda TEXT NOT NULL,
  direttore TEXT,
  telegram_direttore TEXT,
  vantaggi TEXT,
  created_at TEXT NOT NULL
);

-- tipo: 'gruppo' (invia ai canali selezionati) oppure 'privato' (invia in DM a tutti quelli che hanno startato il bot)
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  intervallo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'gruppo',
  canali TEXT NOT NULL DEFAULT '[]',
  attivo INTEGER NOT NULL DEFAULT 1,
  ultimo_invio TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  reparto TEXT,
  risposte TEXT NOT NULL DEFAULT '{}',
  stato TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
`);

// Seed dei permessi di base, uno per ogni comando del bot (solo se la tabella è vuota)
const permCount = db.prepare("SELECT COUNT(*) as c FROM permissions").get() as { c: number };
if (permCount.c === 0) {
  const insert = db.prepare("INSERT INTO permissions (code, description) VALUES (?, ?)");
  const seed = db.transaction(() => {
    insert.run("setpropaganda", "Può impostare il topic della propaganda");
    insert.run("convertmoduli", "Può convertire i moduli di tesseramento");
    insert.run("proponi", "Può proporre eventi");
    insert.run("setchannel", "Può registrare canali");
    insert.run("inoltra", "Può inoltrare messaggi tra gruppi");
  });
  seed();
}

export default db;
