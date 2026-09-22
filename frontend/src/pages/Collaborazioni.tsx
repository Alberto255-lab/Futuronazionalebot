// pages/Collaborazioni.tsx

import { useEffect, useState } from "react";
import Card from "../components/Card";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { ToastMsg } from "../components/Toast";

const VUOTO = { nome_azienda: "", direttore: "", telegram_direttore: "", vantaggi: "" };

export default function Collaborazioni({ notifica }: { notifica: (t: string, tipo?: ToastMsg["tipo"]) => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [modale, setModale] = useState(false);
  const [form, setForm] = useState<any>(VUOTO);
  const [editId, setEditId] = useState<number | null>(null);

  function ricarica() {
    api.get("/api/collaborations").then(setLista);
  }
  useEffect(ricarica, []);

  function apriModale(azienda?: any) {
    if (azienda) {
      setForm(azienda);
      setEditId(azienda.id);
    } else {
      setForm(VUOTO);
      setEditId(null);
    }
    setModale(true);
  }

  async function salva() {
    try {
      if (editId) await api.put(`/api/collaborations/${editId}`, form);
      else await api.post("/api/collaborations", form);
      setModale(false);
      ricarica();
      notifica("Salvato.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  async function elimina(id: number) {
    await api.delete(`/api/collaborations/${id}`);
    ricarica();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Collaborazioni</h1>
        <button onClick={() => apriModale()} className="bg-tgblue px-4 py-2 rounded-xl text-sm font-medium">
          + Aggiungi azienda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map((c) => (
          <Card key={c.id}>
            <h3 className="font-semibold text-gold mb-1">{c.nome_azienda}</h3>
            <p className="text-sm text-white/70">Direttore: {c.direttore} ({c.telegram_direttore})</p>
            <p className="text-sm text-white/70 mb-3">Vantaggi: {c.vantaggi}</p>
            <div className="flex gap-2">
              <button onClick={() => apriModale(c)} className="flex-1 bg-navy py-1.5 rounded-lg text-xs">
                Modifica
              </button>
              <button onClick={() => elimina(c.id)} className="flex-1 bg-red-600/80 py-1.5 rounded-lg text-xs">
                Elimina
              </button>
            </div>
          </Card>
        ))}
      </div>

      {modale && (
        <Modal titolo={editId ? "Modifica azienda" : "Aggiungi azienda"} onClose={() => setModale(false)}>
          <div className="space-y-3">
            <input
              placeholder="Nome azienda"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={form.nome_azienda}
              onChange={(e) => setForm({ ...form, nome_azienda: e.target.value })}
            />
            <input
              placeholder="Direttore"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={form.direttore}
              onChange={(e) => setForm({ ...form, direttore: e.target.value })}
            />
            <input
              placeholder="@direttore"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={form.telegram_direttore}
              onChange={(e) => setForm({ ...form, telegram_direttore: e.target.value })}
            />
            <textarea
              placeholder="Vantaggi per i tesserati"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={form.vantaggi}
              onChange={(e) => setForm({ ...form, vantaggi: e.target.value })}
            />
            <button onClick={salva} className="w-full bg-tgblue py-2 rounded-xl font-medium">
              Salva
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
