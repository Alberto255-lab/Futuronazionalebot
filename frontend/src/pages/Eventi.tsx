// pages/Eventi.tsx

import { useEffect, useState } from "react";
import Card from "../components/Card";
import { api } from "../api/client";
import { ToastMsg } from "../components/Toast";

const TAB = [
  { key: "pending", label: "In attesa" },
  { key: "approved", label: "Approvati" },
  { key: "rejected", label: "Rifiutati" },
];

export default function Eventi({ notifica }: { notifica: (t: string, tipo?: ToastMsg["tipo"]) => void }) {
  const [tab, setTab] = useState("pending");
  const [eventi, setEventi] = useState<any[]>([]);

  function ricarica() {
    api.get(`/api/events?stato=${tab}`).then(setEventi);
  }

  useEffect(ricarica, [tab]);

  async function aggiornaStato(id: number, stato: string) {
    try {
      await api.post(`/api/events/${id}/status`, { stato });
      ricarica();
      notifica(stato === "approved" ? "Evento approvato." : "Evento rifiutato.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Eventi</h1>

      <div className="flex gap-2 mb-6">
        {TAB.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === t.key ? "bg-tgblue" : "bg-navycard text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventi.map((ev) => (
          <Card key={ev.id}>
            <h3 className="font-semibold text-gold mb-1">{ev.titolo}</h3>
            <p className="text-sm text-white/70 mb-2">{ev.descrizione}</p>
            <p className="text-sm mb-4">Budget: <span className="font-medium">{ev.budget}</span></p>
            {tab === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => aggiornaStato(ev.id, "approved")}
                  className="flex-1 bg-green-600 py-2 rounded-xl text-sm font-medium"
                >
                  Approva
                </button>
                <button
                  onClick={() => aggiornaStato(ev.id, "rejected")}
                  className="flex-1 bg-red-600 py-2 rounded-xl text-sm font-medium"
                >
                  Rifiuta
                </button>
              </div>
            )}
          </Card>
        ))}
        {eventi.length === 0 && <p className="text-white/50">Nessun evento in questa categoria.</p>}
      </div>
    </div>
  );
}
