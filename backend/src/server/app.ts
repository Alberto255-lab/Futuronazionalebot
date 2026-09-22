// app.ts
// Applicazione Express: espone /auth/telegram (pubblico) e tutte le /api/* (protette da JWT)

import express from "express";
import cors from "cors";
import { verificaToken } from "./auth";
import authRoutes from "./routes/auth";
import permissionsRoutes from "./routes/permissions";
import propagandaRoutes from "./routes/propaganda";
import eventsRoutes from "./routes/events";
import collaborationsRoutes from "./routes/collaborations";
import remindersRoutes from "./routes/reminders";
import applicationsRoutes from "./routes/applications";
import channelsRoutes from "./routes/channels";

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// Endpoint pubblico di login
app.use("/auth", authRoutes);

// Endpoint pubblico di "salute" del servizio (nessun login richiesto).
// Usato dal job keep-alive per tenere sveglio il servizio su Render.
app.get("/health", (_req, res) => res.json({ ok: true }));

// Middleware: protegge tutte le route /api/*, richiede un JWT valido nell'header Authorization
app.use("/api", (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ errore: "Token mancante." });

  const payload = verificaToken(token);
  if (!payload) return res.status(401).json({ errore: "Token non valido o scaduto." });

  (req as any).utente = payload;
  next();
});

app.use("/api/permissions", permissionsRoutes);
app.use("/api/propaganda", propagandaRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/collaborations", collaborationsRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/channels", channelsRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((_req, res) => res.status(404).json({ errore: "Non trovato." }));

// Gestore errori generico, così anche se qualcosa va storto il server non si blocca
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Errore server:", err);
  res.status(500).json({ errore: "Errore interno del server." });
});
