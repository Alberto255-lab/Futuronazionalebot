// jobs/keepAlive.ts
// Su hosting gratuiti come Render, il servizio "si addormenta" se non riceve
// richieste per 15 minuti — e quando succede, perde il file del database SQLite
// al riavvio successivo. Per evitarlo, ogni 10 minuti il backend chiama da solo
// il proprio indirizzo pubblico: così, agli occhi di Render, il servizio risulta
// sempre "attivo" e non viene mai messo a dormire.
//
// RENDER_EXTERNAL_URL è una variabile che Render imposta AUTOMATICAMENTE
// (non serve configurarla a mano). In locale questa variabile non esiste,
// quindi il job semplicemente non fa nulla: nessun effetto collaterale.

import cron from "node-cron";

export function avviaKeepAlive() {
  const urlPubblico = process.env.RENDER_EXTERNAL_URL;

  if (!urlPubblico) {
    console.log("ℹ️  Keep-alive disattivato (RENDER_EXTERNAL_URL non impostata, siamo in locale).");
    return;
  }

  cron.schedule("*/10 * * * *", async () => {
    try {
      await fetch(`${urlPubblico}/health`);
      console.log("💓 Keep-alive: ping inviato per tenere sveglio il servizio.");
    } catch (err) {
      console.warn("Keep-alive: ping fallito (non grave, si riprova al prossimo giro):", (err as Error).message);
    }
  });

  console.log("💓 Keep-alive job avviato (ping ogni 10 minuti su " + urlPubblico + ").");
}
