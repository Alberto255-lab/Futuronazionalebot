// routes/events.ts
import { Router } from "express";
import { z } from "zod";
import db from "../../db";

const router = Router();

router.get("/", (req, res) => {
  const stato = req.query.stato as string | undefined;
  const rows = stato
    ? db.prepare("SELECT * FROM events WHERE stato = ? ORDER BY created_at DESC").all(stato)
    : db.prepare("SELECT * FROM events ORDER BY created_at DESC").all();
  res.json(rows);
});

const statoSchema = z.object({ stato: z.enum(["pending", "approved", "rejected"]) });
router.post("/:id/status", (req, res) => {
  const parsed = statoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  db.prepare("UPDATE events SET stato = ? WHERE id = ?").run(parsed.data.stato, Number(req.params.id));
  res.json({ ok: true });
});

export default router;
