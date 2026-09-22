// routes/applications.ts
// Candidature ricevute dal flow conversazionale del bot

import { Router } from "express";
import { z } from "zod";
import db from "../../db";
import { bot } from "../../bot/bot";

const router = Router();

router.get("/", (req, res) => {
  const stato = req.query.stato as string | undefined;
  const rows = (
    stato
      ? db.prepare("SELECT * FROM applications WHERE stato = ? ORDER BY created_at DESC").all(stato)
      : db.prepare("SELECT * FROM applications ORDER BY created_at DESC").all()
  ) as any[];
  res.json(rows.map((r) => ({ ...r, risposte: JSON.parse(r.risposte) })));
});

const statoSchema = z.object({ stato: z.enum(["accepted", "rejected"]) });
router.post("/:id/status", async (req, res) => {
  const parsed = statoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });

  const candidatura = db.prepare("SELECT * FROM applications WHERE id = ?").get(Number(req.params.id)) as
    | { user_id: number; reparto: string }
    | undefined;
  if (!candidatura) return res.status(404).json({ errore: "Candidatura non trovata." });

  db.prepare("UPDATE applications SET stato = ? WHERE id = ?").run(parsed.data.stato, Number(req.params.id));

  const messaggio =
    parsed.data.stato === "accepted"
      ? `🎉 La tua candidatura per "${candidatura.reparto}" è stata ACCETTATA! Ti contatteremo a breve.`
      : `La tua candidatura per "${candidatura.reparto}" è stata rifiutata. Grazie per l'interesse dimostrato.`;

  try {
    await bot.api.sendMessage(candidatura.user_id, messaggio);
  } catch (err) {
    console.error("Impossibile inviare il messaggio all'utente (potrebbe aver bloccato il bot):", err);
  }

  res.json({ ok: true });
});

export default router;
