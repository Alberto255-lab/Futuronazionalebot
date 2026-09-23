// pages/Reminders.tsx
// Alert/reminder schedulati. Due tipi:
// - "gruppo": inviati ai canali (gruppi) selezionati
// - "privato": inviati in DM a TUTTI quelli che hanno startato il bot (broadcast privato)

import { useEffect, useState } from "react";
import Card from "../components/Card";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { ToastMsg } from "../components/Toast";

const VUOTO = { nome: "", contenuto: "", valore: "30", unita: "m", tipo: "gruppo", canali: [] as number[] };

export default function Reminders({ notifica }: { notifica: (t: string, tipo?: ToastMsg["tipo"]) => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [canali, setCanali] = useState<any[]>([]);
  const [modale, setModale] = useState(false);
  const [form, setForm] = useState(VUOTO);

  function ricarica() {
    api.get("/api/reminders").then(setLista);
    api.get("/api/channels").then(setCanali);
  }
  useEffect(ricarica, []);

  function toggleCanale(id: number) {
    setForm((f) => ({
      ...f,
      canali: f.canali.includes(id) ? f.canali.filter((c) => c !== id) : [...f.canali, id],
    }));
  }

  async function creaAlert() {
    try {
      await api.post("/api/reminders", {
        nome: form.nome,
        contenuto: form.contenuto,
        intervallo: `${form.valore}${form.unita}`,
        tipo: form.tipo,
        canali: form.tipo === "gruppo" ? form.canali : [],
      });
      setModale(false);
      setForm(VUOTO);
      ricarica();
      notifica("Alert avviato.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  async function stop(id: number) {
    await api.put(`/api/reminders/${id}/stop`);
    ricarica();
  }
  async function start(id: number) {
    await api.put(`/api/reminders/${id}/start`);
    ricarica();
  }
  async function elimina(id: number) {
    await api.delete(`/api/reminders/${id}`);
    ricarica();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <button onClick={() => setModale(true)} className="bg-tgblue px-4 py-2 rounded-xl text-sm font-medium">
          + Crea Alert
        </button>
      </div>

      <div className="space-y-3">
        {lista.map((r) => (
          <Card key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{r.nome}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    r.tipo === "privato" ? "bg-gold/20 text-gold" : "bg-tgblue/20 text-tgblue"
                  }`}
                >
                  {r.tipo === "privato" ? "DM a tutti gli utenti" : "Gruppi"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.attivo ? "bg-green-600/30 text-green-400" : "bg-white/10 text-white/50"}`}>
                  {r.attivo ? "Attivo" : "Fermo"}
                </span>
              </div>
              <p className="text-sm text-white/60 mt-1">{r.contenuto}</p>
              <p className="text-xs text-white/40 mt-1">Ogni {r.intervallo}</p>
            </div>
            <div className="flex gap-2">
              {r.attivo ? (
                <button onClick={() => stop(r.id)} className="bg-white/10 px-3 py-1.5 rounded-lg text-xs">
                  Stop
                </button>
              ) : (
                <button onClick={() => start(r.id)} className="bg-green-600 px-3 py-1.5 rounded-lg text-xs">
                  Start
                </button>
              )}
              <button onClick={() => elimina(r.id)} className="bg-red-600/80 px-3 py-1.5 rounded-lg text-xs">
                Elimina
              </button>
            </div>
          </Card>
        ))}
        {lista.length === 0 && <p className="text-white/50">Nessun reminder creato.</p>}
      </div>

      {modale && (
        <Modal titolo="Crea Alert" onClose={() => setModale(false)}>
          <div className="space-y-3">
            <input
              placeholder="Nome alert"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            <textarea
              placeholder="Contenuto del messaggio"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={form.contenuto}
              onChange={(e) => setForm({ ...form, contenuto: e.target.value })}
            />

            <div>
              <label className="text-xs text-white/50">Invia ogni</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  className="w-24 bg-navy border border-white/10 rounded-xl px-3 py-2"
                  value={form.valore}
                  onChange={(e) => setForm({ ...form, valore: e.target.value })}
                />
                <select
                  className="bg-navy border border-white/10 rounded-xl px-3 py-2"
                  value={form.unita}
                  onChange={(e) => setForm({ ...form, unita: e.target.value })}
                >
                  <option value="s">secondi</option>
                  <option value="m">minuti</option>
                  <option value="h">ore</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50">Destinatari</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tipo: "gruppo" })}
                  className={`flex-1 py-2 rounded-xl text-sm ${form.tipo === "gruppo" ? "bg-tgblue" : "bg-navy border border-white/10"}`}
                >
                  📢 Canali/gruppi
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tipo: "privato" })}
                  className={`flex-1 py-2 rounded-xl text-sm ${form.tipo === "privato" ? "bg-gold text-navy font-semibold" : "bg-navy border border-white/10"}`}
                >
                  💬 DM a tutti gli utenti
                </button>
              </div>
              {form.tipo === "privato" && (
                <p className="text-xs text-white/50 mt-2">
                  Il messaggio verrà inviato in privato a tutte le persone che hanno startato il bot con /start.
                </p>
              )}
            </div>

            {form.tipo === "gruppo" && (
              <div>
                <label className="text-xs text-white/50">Canali</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {canali.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleCanale(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${
                        form.canali.includes(c.id) ? "bg-tgblue" : "bg-navy border border-white/10"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {canali.length === 0 && <p className="text-xs text-white/40">Nessun canale registrato (usa /setchannel nel bot).</p>}
                </div>
              </div>
            )}

            <button onClick={creaAlert} className="w-full bg-tgblue py-2 rounded-xl font-medium">
              Start alert
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
