// jobs/reminders.ts
// Job schedulato (ogni minuto) che controlla i reminder/alert attivi e li invia quando è il momento.
// Due modalità, scelte dal campo "tipo" del reminder:
//  - "gruppo"  -> invia il messaggio nei canali (gruppi) selezionati
//  - "privato" -> invia il messaggio in DM (chat privata) a TUTTE le persone che hanno startato il bot

import cron from "node-cron";
import { bot } from "../bot/bot";
import db from "../db";

interface Reminder {
  id: number;
  nome: string;
  contenuto: string;
  intervallo: string; // es. "30m", "2h", "45s"
  tipo: "gruppo" | "privato";
  canali: string; // JSON array di id canale
  attivo: number;
  ultimo_invio: string | null;
  created_at: string;
}

// Converte "30m" / "2h" / "45s" in millisecondi
function intervalloInMs(intervallo: string): number {
  const match = intervallo.match(/^(\d+)([hms])$/);
  if (!match) return 0;
  const valore = parseInt(match[1], 10);
  const unita = match[2];
  if (unita === "h") return valore * 3600_000;
  if (unita === "m") return valore * 60_000;
  return valore * 1000;
}

// Piccola pausa, usata per non intasare l'API di Telegram quando si invia a tanti utenti
function attendi(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function eseguiReminder(reminder: Reminder) {
  if (reminder.tipo === "gruppo") {
    const canaliIds: number[] = JSON.parse(reminder.canali);
    for (const canaleId of canaliIds) {
      const canale = db.prepare("SELECT * FROM channels WHERE id = ?").get(canaleId) as
        | { telegram_chat_id: number }
        | undefined;
      if (!canale) continue;
      try {
        await bot.api.sendMessage(canale.telegram_chat_id, reminder.contenuto);
      } catch (err) {
        console.error(`Errore invio reminder "${reminder.nome}" al canale ${canaleId}:`, err);
      }
    }
  } else {
    // tipo "privato": invia a tutti gli utenti che hanno startato il bot
    const utenti = db.prepare("SELECT telegram_id FROM bot_users").all() as { telegram_id: number }[];
    for (const utente of utenti) {
      try {
        await bot.api.sendMessage(utente.telegram_id, reminder.contenuto);
      } catch (err) {
        // Capita spesso: l'utente ha bloccato il bot. Non è un errore grave, si continua con gli altri.
        console.warn(`Impossibile inviare a ${utente.telegram_id} (bot bloccato?):`, (err as Error).message);
      }
      await attendi(40); // ~25 messaggi al secondo, sotto i limiti di Telegram
    }
  }

  db.prepare("UPDATE reminders SET ultimo_invio = ? WHERE id = ?").run(new Date().toISOString(), reminder.id);
}

export function avviaJobReminders() {
  // Ogni minuto controlla se qualche reminder attivo deve essere inviato
  cron.schedule("* * * * *", async () => {
    const reminders = db.prepare("SELECT * FROM reminders WHERE attivo = 1").all() as Reminder[];
    const ora = Date.now();

    for (const reminder of reminders) {
      const ms = intervalloInMs(reminder.intervallo);
      if (ms <= 0) continue;
      const ultimo = reminder.ultimo_invio ? new Date(reminder.ultimo_invio).getTime() : new Date(reminder.created_at).getTime();
      if (ora - ultimo >= ms) {
        await eseguiReminder(reminder);
      }
    }
  });

  console.log("⏰ Job reminders avviato (controllo ogni minuto).");
}
