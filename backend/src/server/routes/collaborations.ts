// routes/collaborations.ts
import { Router } from "express";
import { z } from "zod";
import db from "../../db";

const router = Router();

router.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM collaborations ORDER BY created_at DESC").all());
});

const schema = z.object({
  nome_azienda: z.string().min(1),
  direttore: z.string().optional(),
  telegram_direttore: z.string().optional(),
  vantaggi: z.string().optional(),
});

router.post("/", (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  const d = parsed.data;
  const info = db
    .prepare(
      "INSERT INTO collaborations (nome_azienda, direttore, telegram_direttore, vantaggi, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(d.nome_azienda, d.direttore || "", d.telegram_direttore || "", d.vantaggi || "", new Date().toISOString());
  res.json({ id: info.lastInsertRowid, ...d });
});

router.put("/:id", (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  const d = parsed.data;
  db.prepare(
    "UPDATE collaborations SET nome_azienda=?, direttore=?, telegram_direttore=?, vantaggi=? WHERE id=?"
  ).run(d.nome_azienda, d.direttore || "", d.telegram_direttore || "", d.vantaggi || "", Number(req.params.id));
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM collaborations WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
