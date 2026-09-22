// pages/Dashboard.tsx
// Panoramica generale

import { useEffect, useState } from "react";
import Card from "../components/Card";
import { api } from "../api/client";

export default function Dashboard() {
  const [conteggi, setConteggi] = useState({ eventi: 0, candidature: 0, collaborazioni: 0, reminders: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/api/events?stato=pending"),
      api.get("/api/applications?stato=pending"),
      api.get("/api/collaborations"),
      api.get("/api/reminders"),
    ]).then(([eventi, candidature, collab, reminders]) => {
      setConteggi({
        eventi: eventi.length,
        candidature: candidature.length,
        collaborazioni: collab.length,
        reminders: reminders.filter((r: any) => r.attivo).length,
      });
    });
  }, []);

  const voci = [
    { label: "Eventi in attesa", valore: conteggi.eventi, icona: "🎉" },
    { label: "Candidature in attesa", valore: conteggi.candidature, icona: "📋" },
    { label: "Collaborazioni attive", valore: conteggi.collaborazioni, icona: "🤝" },
    { label: "Reminder attivi", valore: conteggi.reminders, icona: "⏰" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {voci.map((v) => (
          <Card key={v.label}>
            <div className="text-3xl mb-2">{v.icona}</div>
            <div className="text-3xl font-bold text-gold">{v.valore}</div>
            <div className="text-white/60 text-sm mt-1">{v.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
