// routes/propaganda.ts
// Ruoli, tesseramenti e riepilogo propagandisti

import { Router } from "express";
import { z } from "zod";
import db from "../../db";

const router = Router();

// Ruoli
router.get("/roles", (_req, res) => {
  res.json(db.prepare("SELECT * FROM propaganda_roles ORDER BY name").all());
});

const roleSchema = z.object({ name: z.string().min(1), stipendio: z.number().nonnegative() });
router.post("/roles", (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  const info = db.prepare("INSERT INTO propaganda_roles (name, stipendio) VALUES (?, ?)").run(
    parsed.data.name,
    parsed.data.stipendio
  );
  res.json({ id: info.lastInsertRowid, ...parsed.data });
});

router.put("/roles/:id", (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  db.prepare("UPDATE propaganda_roles SET name = ?, stipendio = ? WHERE id = ?").run(
    parsed.data.name,
    parsed.data.stipendio,
    Number(req.params.id)
  );
  res.json({ ok: true });
});

router.delete("/roles/:id", (req, res) => {
  db.prepare("DELETE FROM propaganda_roles WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// Tesseramenti settimanali (con filtro opzionale per settimana)
router.get("/tesseramenti", (req, res) => {
  const settimana = req.query.settimana as string | undefined;
  const rows = settimana
    ? db.prepare("SELECT * FROM tesseramenti WHERE settimana = ? ORDER BY created_at DESC").all(settimana)
    : db.prepare("SELECT * FROM tesseramenti ORDER BY created_at DESC").all();
  res.json(rows);
});

// Aggiorna il ruolo assegnato a un propagandista (per un tesseramento specifico, o per tutti quelli con lo stesso username)
router.put("/tesseramenti/:id/ruolo", (req, res) => {
  const ruoloId = req.body.ruolo_id === null ? null : Number(req.body.ruolo_id);
  db.prepare("UPDATE tesseramenti SET ruolo_id = ? WHERE id = ?").run(ruoloId, Number(req.params.id));
  res.json({ ok: true });
});

// Riepilogo aggregato per propagandista: tesseramenti totali, ruolo attuale, stipendio calcolato
router.get("/riepilogo", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT
        propagandista_username as telegram,
        COUNT(*) as tesseramenti,
        SUM(CASE WHEN conta_stipendio = 1 THEN 1 ELSE 0 END) as validi_stipendio,
        (SELECT ruolo_id FROM tesseramenti t2 WHERE t2.propagandista_username = t1.propagandista_username ORDER BY created_at DESC LIMIT 1) as ruolo_id
       FROM tesseramenti t1
       GROUP BY propagandista_username`
    )
    .all() as any[];

  const ruoli = db.prepare("SELECT * FROM propaganda_roles").all() as { id: number; name: string; stipendio: number }[];
  const mappaRuoli = new Map(ruoli.map((r) => [r.id, r]));

  const risultato = rows.map((r) => {
    const ruolo = r.ruolo_id ? mappaRuoli.get(r.ruolo_id) : undefined;
    return {
      telegram: r.telegram,
      tesseramenti: r.tesseramenti,
      ruolo: ruolo?.name || "Nessun ruolo",
      ruolo_id: r.ruolo_id || null,
      stipendio: ruolo ? ruolo.stipendio * r.validi_stipendio : 0,
    };
  });
  res.json(risultato);
});

export default router;
