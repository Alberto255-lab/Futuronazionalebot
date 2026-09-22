// routes/channels.ts
// Lista dei canali registrati via /setchannel (serve al frontend per il multiselect dei reminder)

import { Router } from "express";
import db from "../../db";

const router = Router();

router.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM channels ORDER BY name").all());
});

export default router;
