// routes/permissions.ts
// Gestione gruppi, membri, permessi e site_admins

import { Router } from "express";
import { z } from "zod";
import db from "../../db";

const router = Router();

// Lista gruppi in cui il bot è presente
router.get("/groups", (_req, res) => {
  const gruppi = db.prepare("SELECT * FROM groups ORDER BY title").all();
  res.json(gruppi);
});

// Lista permessi disponibili
router.get("/permissions", (_req, res) => {
  const permessi = db.prepare("SELECT * FROM permissions ORDER BY id").all();
  res.json(permessi);
});

// Lista membri di un gruppo con i loro permessi
router.get("/groups/:groupId/members", (req, res) => {
  const groupId = Number(req.params.groupId);
  const membri = db
    .prepare(
      `SELECT gm.id as member_id, gm.user_id,
        (SELECT username FROM bot_users WHERE telegram_id = gm.user_id) as username,
        (SELECT GROUP_CONCAT(p.code) FROM group_member_permissions gmp
          JOIN permissions p ON p.id = gmp.permission_id WHERE gmp.member_id = gm.id) as permessi
       FROM group_members gm WHERE gm.group_id = ?`
    )
    .all(groupId);
  res.json(membri);
});

// Aggiunge un membro a un gruppo (se non esiste già)
const membroSchema = z.object({ user_id: z.number(), group_id: z.number() });
router.post("/groups/members", (req, res) => {
  const parsed = membroSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  const { user_id, group_id } = parsed.data;
  db.prepare("INSERT OR IGNORE INTO group_members (user_id, group_id) VALUES (?, ?)").run(user_id, group_id);
  const membro = db.prepare("SELECT * FROM group_members WHERE user_id = ? AND group_id = ?").get(user_id, group_id);
  res.json(membro);
});

// Aggiorna i permessi di un membro (sostituisce tutti i permessi con quelli inviati)
const setPermSchema = z.object({ permission_ids: z.array(z.number()) });
router.put("/groups/members/:memberId/permissions", (req, res) => {
  const memberId = Number(req.params.memberId);
  const parsed = setPermSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });

  const transazione = db.transaction(() => {
    db.prepare("DELETE FROM group_member_permissions WHERE member_id = ?").run(memberId);
    const insert = db.prepare("INSERT INTO group_member_permissions (member_id, permission_id) VALUES (?, ?)");
    for (const permId of parsed.data.permission_ids) insert.run(memberId, permId);
  });
  transazione();
  res.json({ ok: true });
});

// Site admins: lista, aggiungi, rimuovi
router.get("/site-admins", (_req, res) => {
  res.json(db.prepare("SELECT * FROM site_admins ORDER BY added_at").all());
});

const siteAdminSchema = z.object({ telegram_id: z.number() });
router.post("/site-admins", (req, res) => {
  const parsed = siteAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errore: parsed.error.message });
  db.prepare("INSERT OR IGNORE INTO site_admins (telegram_id, added_at) VALUES (?, ?)").run(
    parsed.data.telegram_id,
    new Date().toISOString()
  );
  res.json({ ok: true });
});

router.delete("/site-admins/:telegramId", (req, res) => {
  db.prepare("DELETE FROM site_admins WHERE telegram_id = ?").run(Number(req.params.telegramId));
  res.json({ ok: true });
});

export default router;
