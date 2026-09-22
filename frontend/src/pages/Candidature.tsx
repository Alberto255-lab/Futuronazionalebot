// pages/Candidature.tsx

import { useEffect, useState } from "react";
import Card from "../components/Card";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { ToastMsg } from "../components/Toast";

export default function Candidature({ notifica }: { notifica: (t: string, tipo?: ToastMsg["tipo"]) => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [aperta, setAperta] = useState<any | null>(null);

  function ricarica() {
    api.get("/api/applications?stato=pending").then(setLista);
  }
  useEffect(ricarica, []);

  async function decidi(id: number, stato: "accepted" | "rejected") {
    try {
      await api.post(`/api/applications/${id}/status`, { stato });
      setAperta(null);
      ricarica();
      notifica(stato === "accepted" ? "Candidatura accettata." : "Candidatura rifiutata.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Candidature</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map((c) => (
          <Card key={c.id} className="cursor-pointer" >
            <p className="text-xs text-white/40 mb-1">{new Date(c.created_at).toLocaleDateString("it-IT")}</p>
            <h3 className="font-semibold text-gold">@{c.username || c.user_id}</h3>
            <p className="text-sm text-white/70 mb-3">Reparto: {c.reparto}</p>
            <button onClick={() => setAperta(c)} className="w-full bg-navy py-2 rounded-lg text-sm">
              Apri
            </button>
          </Card>
        ))}
        {lista.length === 0 && <p className="text-white/50">Nessuna candidatura in attesa.</p>}
      </div>

      {aperta && (
        <Modal titolo={`Candidatura di @${aperta.username || aperta.user_id}`} onClose={() => setAperta(null)}>
          <div className="space-y-3 text-sm">
            {Object.entries(aperta.risposte).map(([chiave, valore]) => (
              <div key={chiave}>
                <p className="text-white/50 text-xs uppercase">{chiave}</p>
                <p>{String(valore)}</p>
              </div>
            ))}
            <div className="flex gap-2 pt-3">
              <button
                onClick={() => decidi(aperta.id, "accepted")}
                className="flex-1 bg-green-600 py-2 rounded-xl font-medium"
              >
                Accetta
              </button>
              <button
                onClick={() => decidi(aperta.id, "rejected")}
                className="flex-1 bg-red-600 py-2 rounded-xl font-medium"
              >
                Rifiuta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
