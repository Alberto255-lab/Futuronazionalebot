// bot.ts
// Istanza del bot Telegram (libreria grammY) con tutti i comandi richiesti.
// NOTA IMPORTANTE: un bot Telegram non può leggere i messaggi scritti PRIMA che
// venga aggiunto o riavviato: può solo "ascoltare" i messaggi che arrivano da quel
// momento in poi. Per questo /convertmoduli lavora sui messaggi che il bot ha
// salvato via via nella tabella propaganda_messages, non su una "cronologia".

import { Bot, Context } from "grammy";
import db from "../db";
import { isModulo, parseModulo } from "./parsers/moduloParser";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN mancante nel file .env");
}

export const bot = new Bot(BOT_TOKEN);

// Stato in memoria per il flow conversazionale di /candidatura
// (domande fatte una alla volta in chat privata)
interface SessioneCandidatura {
  step: number;
  risposte: Record<string, string>;
}
const sessioniCandidatura = new Map<number, SessioneCandidatura>();
const DOMANDE_CANDIDATURA = [
  { chiave: "reparto", testo: "In che reparto vuoi candidarti?" },
  { chiave: "nome", testo: "Qual è il tuo nome?" },
  { chiave: "eta", testo: "Quanti anni hai?" },
  { chiave: "motivazione", testo: "Perché vuoi entrare a far parte di noi? (motivazione)" },
];

function oggiISO(): string {
  return new Date().toISOString();
}

// Calcola l'inizio (lunedì) e la fine (domenica) della settimana scorsa, e la etichetta "YYYY-Www"
function settimanaScorsa(): { inizio: Date; fine: Date; etichetta: string } {
  const ora = new Date();
  const giorno = ora.getDay() === 0 ? 7 : ora.getDay(); // lunedì=1 ... domenica=7
  const lunediQuestaSettimana = new Date(ora);
  lunediQuestaSettimana.setHours(0, 0, 0, 0);
  lunediQuestaSettimana.setDate(ora.getDate() - (giorno - 1));

  const inizio = new Date(lunediQuestaSettimana);
  inizio.setDate(inizio.getDate() - 7); // lunedì scorso
  const fine = new Date(lunediQuestaSettimana);
  fine.setMilliseconds(-1); // domenica scorsa 23:59:59.999

  // Numero di settimana ISO approssimato
  const primoGennaio = new Date(inizio.getFullYear(), 0, 1);
  const numSettimana = Math.ceil(((inizio.getTime() - primoGennaio.getTime()) / 86400000 + primoGennaio.getDay() + 1) / 7);
  const etichetta = `${inizio.getFullYear()}-W${String(numSettimana).padStart(2, "0")}`;

  return { inizio, fine, etichetta };
}

// /start — messaggio di benvenuto + registrazione utente nella tabella bot_users
// (serve per poter poi fare il broadcast privato "a tutti quelli che hanno startato il bot")
bot.command("start", async (ctx) => {
  if (ctx.chat.type === "private" && ctx.from) {
    db.prepare(
      `INSERT INTO bot_users (telegram_id, username, first_name, last_name, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name, last_name=excluded.last_name`
    ).run(ctx.from.id, ctx.from.username || null, ctx.from.first_name || null, ctx.from.last_name || null, oggiISO());
  }
  await ctx.reply(
    "Ciao! 👋 Sono il bot di gestione.\n\nUsa /candidatura se vuoi proporti per entrare a far parte del team, oppure contatta un admin per maggiori informazioni."
  );
});

// Quando il bot viene aggiunto/rimosso da un gruppo, aggiorniamo la tabella groups
bot.on("my_chat_member", async (ctx) => {
  const chat = ctx.chat;
  if (chat.type !== "group" && chat.type !== "supergroup") return;
  const nuovoStato = ctx.myChatMember.new_chat_member.status;
  if (nuovoStato === "member" || nuovoStato === "administrator") {
    db.prepare(
      `INSERT INTO groups (telegram_chat_id, title, added_at) VALUES (?, ?, ?)
       ON CONFLICT(telegram_chat_id) DO UPDATE SET title=excluded.title`
    ).run(chat.id, "title" in chat ? chat.title : "Gruppo", oggiISO());
  }
});

// Helper: controlla se un utente ha un permesso specifico nel gruppo corrente
function haPermesso(userId: number, groupId: number, codicePermesso: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM group_members gm
       JOIN group_member_permissions gmp ON gmp.member_id = gm.id
       JOIN permissions p ON p.id = gmp.permission_id
       WHERE gm.user_id = ? AND gm.group_id = ? AND p.code = ?`
    )
    .get(userId, groupId, codicePermesso);
  return !!row;
}

function eSiteAdmin(userId: number): boolean {
  const row = db.prepare("SELECT 1 FROM site_admins WHERE telegram_id = ?").get(userId);
  return !!row;
}

// Un site_admin può sempre tutto; altrimenti serve il permesso specifico
function puoEseguire(ctx: Context, codicePermesso: string): boolean {
  if (!ctx.from || !ctx.chat) return false;
  if (eSiteAdmin(ctx.from.id)) return true;
  return haPermesso(ctx.from.id, ctx.chat.id, codicePermesso);
}

// /setpropaganda — da usare DENTRO un topic di un gruppo
bot.command("setpropaganda", async (ctx) => {
  if (ctx.chat.type !== "supergroup") {
    return ctx.reply("Questo comando va usato in un gruppo con i topic attivi.");
  }
  if (!puoEseguire(ctx, "setpropaganda")) {
    return ctx.reply("Non hai il permesso per usare questo comando.");
  }
  const topicId = ctx.message?.message_thread_id;
  if (!topicId) {
    return ctx.reply("Devi usare questo comando DENTRO un topic (non nella chat generale).");
  }
  db.prepare("DELETE FROM propaganda_config WHERE group_id = ?").run(ctx.chat.id);
  db.prepare("INSERT INTO propaganda_config (group_id, topic_id) VALUES (?, ?)").run(ctx.chat.id, topicId);
  await ctx.reply(`✅ Topic propaganda impostato su questo topic (id ${topicId}).`);
});

// Salva ogni messaggio scritto nel topic propaganda configurato (serve per /convertmoduli)
bot.on("message:text", async (ctx, next) => {
  if (ctx.chat.type === "supergroup" && ctx.message.message_thread_id) {
    const config = db
      .prepare("SELECT * FROM propaganda_config WHERE group_id = ? AND topic_id = ?")
      .get(ctx.chat.id, ctx.message.message_thread_id) as { group_id: number; topic_id: number } | undefined;
    if (config) {
      db.prepare(
        "INSERT INTO propaganda_messages (group_id, topic_id, testo, data) VALUES (?, ?, ?, ?)"
      ).run(config.group_id, config.topic_id, ctx.message.text, oggiISO());
    }
  }
  await next();
});

// /convertmoduli — converte i moduli salvati la settimana scorsa (lunedì-domenica)
bot.command("convertmoduli", async (ctx) => {
  if (ctx.chat.type !== "supergroup") {
    return ctx.reply("Questo comando va usato nel gruppo con il topic propaganda.");
  }
  if (!puoEseguire(ctx, "convertmoduli")) {
    return ctx.reply("Non hai il permesso per usare questo comando.");
  }
  const config = db.prepare("SELECT * FROM propaganda_config WHERE group_id = ?").get(ctx.chat.id) as
    | { group_id: number; topic_id: number }
    | undefined;
  if (!config) {
    return ctx.reply("Nessun topic propaganda configurato. Usa prima /setpropaganda.");
  }

  const { inizio, fine, etichetta } = settimanaScorsa();
  const messaggi = db
    .prepare(
      `SELECT * FROM propaganda_messages
       WHERE group_id = ? AND topic_id = ? AND convertito = 0 AND data BETWEEN ? AND ?`
    )
    .all(config.group_id, config.topic_id, inizio.toISOString(), fine.toISOString()) as {
    id: number;
    testo: string;
  }[];

  let convertiti = 0;
  let validiStipendio = 0;
  const insert = db.prepare(
    `INSERT INTO tesseramenti (propagandista_id, propagandista_username, tesserato_nome, tesserato_telegram, ruolo_id, conta_stipendio, settimana, created_at)
     VALUES (NULL, ?, ?, ?, NULL, ?, ?, ?)`
  );
  const segnaConvertito = db.prepare("UPDATE propaganda_messages SET convertito = 1 WHERE id = ?");

  const transazione = db.transaction(() => {
    for (const msg of messaggi) {
      if (!isModulo(msg.testo)) continue;
      const modulo = parseModulo(msg.testo);
      if (!modulo) continue;
      insert.run(
        modulo.propagandista,
        modulo.cittadino,
        modulo.telegram,
        modulo.contaStipendio ? 1 : 0,
        etichetta,
        oggiISO()
      );
      if (modulo.contaStipendio) validiStipendio++;
      convertiti++;
      segnaConvertito.run(msg.id);
    }
  });
  transazione();

  await ctx.reply(
    `✅ Conversione completata per la settimana ${etichetta}.\n${convertiti} moduli convertiti, ${validiStipendio} validi per lo stipendio.`
  );
});

// /proponi [titolo] | [descrizione] | [budget]
bot.command("proponi", async (ctx) => {
  if (!puoEseguire(ctx, "proponi")) {
    return ctx.reply("Non hai il permesso per usare questo comando.");
  }
  const testo = ctx.match?.toString() || "";
  const parti = testo.split("|").map((p) => p.trim());
  if (parti.length < 3 || !parti[0]) {
    return ctx.reply("Formato corretto: /proponi Titolo | Descrizione | Budget");
  }
  const [titolo, descrizione, budgetStr] = parti;
  const budget = parseInt(budgetStr.replace(/\D/g, ""), 10) || 0;
  db.prepare("INSERT INTO events (titolo, descrizione, budget, stato, created_at) VALUES (?, ?, ?, 'pending', ?)").run(
    titolo,
    descrizione,
    budget,
    oggiISO()
  );
  await ctx.reply("✅ Evento inviato al sito per approvazione.");
});

// /setchannel [nomegruppo]
bot.command("setchannel", async (ctx) => {
  if (!puoEseguire(ctx, "setchannel")) {
    return ctx.reply("Non hai il permesso per usare questo comando.");
  }
  const nome = ctx.match?.toString().trim();
  if (!nome) {
    return ctx.reply("Formato corretto: /setchannel nomegruppo");
  }
  db.prepare(
    `INSERT INTO channels (name, telegram_chat_id) VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET telegram_chat_id = excluded.telegram_chat_id`
  ).run(nome, ctx.chat.id);
  await ctx.reply(`✅ Questo gruppo è stato registrato come canale "${nome}".`);
});

// /inoltra [nomegruppo] — deve essere usato in risposta a un messaggio
bot.command("inoltra", async (ctx) => {
  if (!puoEseguire(ctx, "inoltra")) {
    return ctx.reply("Non hai il permesso per usare questo comando.");
  }
  const nome = ctx.match?.toString().trim();
  const rispostaA = ctx.message?.reply_to_message;
  if (!nome) return ctx.reply("Formato corretto: /inoltra nomegruppo (in risposta a un messaggio)");
  if (!rispostaA || !rispostaA.text) {
    return ctx.reply("Devi usare questo comando IN RISPOSTA a un messaggio di testo.");
  }
  const canale = db.prepare("SELECT * FROM channels WHERE name = ?").get(nome) as
    | { telegram_chat_id: number }
    | undefined;
  if (!canale) return ctx.reply(`Nessun canale registrato con il nome "${nome}".`);

  try {
    // Copia il testo (non inoltro nativo, quindi non appare "Inoltrato da...")
    await ctx.api.sendMessage(canale.telegram_chat_id, rispostaA.text);
    await ctx.reply("✅ Messaggio copiato.");
  } catch (err) {
    console.error("Errore invio /inoltra:", err);
    await ctx.reply("❌ Errore durante l'invio del messaggio.");
  }
});

// /candidatura — avvia il flow conversazionale in privato
bot.command("candidatura", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply("Scrivimi in privato per candidarti!");
  }
  sessioniCandidatura.set(ctx.from!.id, { step: 0, risposte: {} });
  await ctx.reply(DOMANDE_CANDIDATURA[0].testo);
});

// Gestisce le risposte del flow candidatura (deve stare DOPO gli altri handler di testo)
bot.on("message:text", async (ctx) => {
  if (ctx.chat.type !== "private" || !ctx.from) return;
  const sessione = sessioniCandidatura.get(ctx.from.id);
  if (!sessione) return; // nessuna candidatura in corso, ignora

  const domandaCorrente = DOMANDE_CANDIDATURA[sessione.step];
  sessione.risposte[domandaCorrente.chiave] = ctx.message.text;
  sessione.step++;

  if (sessione.step < DOMANDE_CANDIDATURA.length) {
    await ctx.reply(DOMANDE_CANDIDATURA[sessione.step].testo);
  } else {
    db.prepare(
      "INSERT INTO applications (user_id, username, reparto, risposte, stato, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
    ).run(ctx.from.id, ctx.from.username || null, sessione.risposte.reparto, JSON.stringify(sessione.risposte), oggiISO());
    sessioniCandidatura.delete(ctx.from.id);
    await ctx.reply("✅ Grazie! La tua candidatura è stata inviata, ti risponderemo al più presto.");
  }
});

bot.catch((err) => {
  console.error("Errore nel bot:", err);
});
