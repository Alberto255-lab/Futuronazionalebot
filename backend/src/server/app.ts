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

// Normalizza l'URL del frontend per il confronto CORS: toglie eventuali "/"
// finali e ignora maiuscole/minuscole, così un errore di battitura nella
// variabile d'ambiente (es. "FuturoBot" invece di "futurobot") non blocca tutto.
const FRONTEND_URL = (process.env.FRONTEND_URL || "").replace(/\/+$/, "").toLowerCase();

app.use(
  cors({
    origin: (origin, callback) => {
      // Richieste senza origin (es. da Postman o curl) sono sempre permesse
      if (!origin) return callback(null, true);
      if (!FRONTEND_URL) return callback(null, true); // se non configurato, permetti tutto (comodo in sviluppo)
      const origineNormalizzata = origin.replace(/\/+$/, "").toLowerCase();
      if (origineNormalizzata === FRONTEND_URL) return callback(null, true);
      console.warn(`CORS: origine rifiutata "${origin}" (attesa: "${process.env.FRONTEND_URL}")`);
      callback(new Error("Non permesso da CORS"));
    },
  })
);
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
