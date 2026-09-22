// routes/reminders.ts
// CRUD dei reminder/alert. Ogni reminder ha un "tipo":
// - "gruppo"  -> viene inviato ai canali selezionati (come i reminder classici)
// - "privato" -> viene inviato in messaggio privato (DM) a TUTTI quelli che hanno startato il bot
// L'invio vero e proprio lo fa il job schedulato in jobs/reminders.ts

import { Router } from "express";
import { z } from "zod";
import db from "../../db";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM reminders ORDER BY created_at DESC").all() as any[];
  // I "canali" sono salvati come stringa JSON nel DB, li converto in array per il frontend
  res.json(rows.map((r) => ({ ...r, canali: JSON.parse(r.canali), attivo: !!r.attivo })));
});

const schema = z.object({
  nome: z.string().min(1),
  contenuto: z.string().min(1),
  intervallo: z.string().regex(/^\d+[hms]$/, "Formato intervallo non valido, usa es. 30m, 2h, 45s"),
  tipo: z.enum(["gruppo", "privato"]).default("gruppo"),
  // canali obbligatori solo se tipo = gruppo; per "privato" viene ignorato (si invia a tutti gli utenti)
  canali: z.array(z.number()).default([]),
});

router.post("/", (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  const d = parsed.data;
  if (d.tipo === "gruppo" && d.canali.length === 0) {
    return res.status(400).json({ errore: "Seleziona almeno un canale per un reminder di tipo gruppo." });
  }
  const info = db
    .prepare(
      "INSERT INTO reminders (nome, contenuto, intervallo, tipo, canali, attivo, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
    )
    .run(d.nome, d.contenuto, d.intervallo, d.tipo, JSON.stringify(d.canali), new Date().toISOString());
  res.json({ id: info.lastInsertRowid, ...d, attivo: true });
});

// Ferma un reminder (attivo = false) senza eliminarlo
router.put("/:id/stop", (req, res) => {
  db.prepare("UPDATE reminders SET attivo = 0 WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

router.put("/:id/start", (req, res) => {
  db.prepare("UPDATE reminders SET attivo = 1 WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM reminders WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
