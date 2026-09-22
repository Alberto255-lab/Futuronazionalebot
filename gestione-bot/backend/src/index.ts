// index.ts
// Entry point: carica le variabili d'ambiente, avvia il bot Telegram, il server Express e il job dei reminder.

import "dotenv/config";
import { bot } from "./bot/bot";
import { app } from "./server/app";
import { avviaJobReminders } from "./jobs/reminders";
import { avviaKeepAlive } from "./jobs/keepAlive";

const PORT = process.env.PORT || 3000;

async function main() {
  // Avvia il bot in modalità "long polling" (semplice, non richiede un URL pubblico per i webhook)
  bot.start({
    onStart: () => console.log("🤖 Bot Telegram avviato (long polling)."),
  });

  app.listen(PORT, () => {
    console.log(`🌐 Server API avviato su http://localhost:${PORT}`);
  });

  avviaJobReminders();
  avviaKeepAlive();
}

main().catch((err) => {
  console.error("Errore fatale all'avvio:", err);
  process.exit(1);
});
