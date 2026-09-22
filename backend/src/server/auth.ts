// auth.ts
// Verifica del login tramite Telegram Login Widget e generazione del JWT (token di accesso al pannello).

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { TelegramLoginData, JwtPayload } from "../types";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const JWT_SECRET = process.env.JWT_SECRET!;
const ALLOWED_ADMIN_IDS = (process.env.ALLOWED_ADMIN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);

// Verifica che i dati ricevuti dal Telegram Login Widget siano autentici e non manomessi.
// Algoritmo spiegato nella documentazione ufficiale del Telegram Login Widget.
export function verificaFirmaTelegram(data: TelegramLoginData): boolean {
  const { hash, ...resto } = data;

  const dataCheckString = Object.keys(resto)
    .sort()
    .map((key) => `${key}=${(resto as any)[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return hmac === hash;
}

// L'auth_date non deve essere più vecchia di 24 ore (login "fresco")
export function loginNonScaduto(authDate: number): boolean {
  const oreTrascorse = (Date.now() / 1000 - authDate) / 3600;
  return oreTrascorse < 24;
}

export function idAutorizzato(telegramId: number): boolean {
  return ALLOWED_ADMIN_IDS.includes(telegramId);
}

export function generaToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verificaToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
