// routes/auth.ts
// Endpoint pubblico di login: riceve i dati dal Telegram Login Widget

import { Router } from "express";
import db from "../../db";
import { verificaFirmaTelegram, loginNonScaduto, idAutorizzato, generaToken } from "../auth";
import { TelegramLoginData } from "../../types";

const router = Router();

router.post("/telegram", (req, res) => {
  const data = req.body as TelegramLoginData;

  if (!data || !data.id || !data.hash || !data.auth_date) {
    return res.status(400).json({ errore: "Dati di login mancanti o incompleti." });
  }

  // 1. Verifica firma HMAC
  if (!verificaFirmaTelegram(data)) {
    return res.status(401).json({ errore: "Firma non valida. Login rifiutato." });
  }

  // 2. Verifica che non sia scaduto
  if (!loginNonScaduto(data.auth_date)) {
    return res.status(401).json({ errore: "Login scaduto, riprova." });
  }

  // 3. Verifica che l'utente sia autorizzato (in ALLOWED_ADMIN_IDS oppure site_admin da DB)
  const daDb = db.prepare("SELECT 1 FROM site_admins WHERE telegram_id = ?").get(data.id);
  if (!idAutorizzato(data.id) && !daDb) {
    return res.status(403).json({ errore: "Non sei autorizzato ad accedere al pannello." });
  }

  const token = generaToken({ telegram_id: data.id, username: data.username, first_name: data.first_name });
  res.json({ token, utente: { id: data.id, username: data.username, first_name: data.first_name } });
});

export default router;
