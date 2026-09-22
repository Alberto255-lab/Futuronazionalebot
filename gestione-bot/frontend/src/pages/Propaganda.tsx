// pages/Propaganda.tsx

import { useEffect, useState } from "react";
import Card from "../components/Card";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { ToastMsg } from "../components/Toast";

export default function Propaganda({ notifica }: { notifica: (t: string, tipo?: ToastMsg["tipo"]) => void }) {
  const [riepilogo, setRiepilogo] = useState<any[]>([]);
  const [ruoli, setRuoli] = useState<any[]>([]);
  const [tesseramenti, setTesseramenti] = useState<any[]>([]);
  const [settimana, setSettimana] = useState("");
  const [modaleRuolo, setModaleRuolo] = useState(false);
  const [nomeRuolo, setNomeRuolo] = useState("");
  const [stipendioRuolo, setStipendioRuolo] = useState("");

  function ricarica() {
    api.get("/api/propaganda/riepilogo").then(setRiepilogo);
    api.get("/api/propaganda/roles").then(setRuoli);
    api.get(`/api/propaganda/tesseramenti${settimana ? `?settimana=${settimana}` : ""}`).then(setTesseramenti);
  }

  useEffect(ricarica, [settimana]);

  async function creaRuolo() {
    if (!nomeRuolo || !stipendioRuolo) return;
    try {
      await api.post("/api/propaganda/roles", { name: nomeRuolo, stipendio: Number(stipendioRuolo) });
      setModaleRuolo(false);
      setNomeRuolo("");
      setStipendioRuolo("");
      ricarica();
      notifica("Ruolo creato.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  async function eliminaRuolo(id: number) {
    await api.delete(`/api/propaganda/roles/${id}`);
    ricarica();
  }

  async function cambiaRuoloTesseramento(id: number, ruoloId: string) {
    await api.put(`/api/propaganda/tesseramenti/${id}/ruolo`, { ruolo_id: ruoloId ? Number(ruoloId) : null });
    ricarica();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Propaganda</h1>
        <button onClick={() => setModaleRuolo(true)} className="bg-tgblue px-4 py-2 rounded-xl text-sm font-medium">
          + Crea ruolo
        </button>
      </div>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Riepilogo propagandisti</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2 pr-4">@Telegram</th>
                <th className="py-2 pr-4">Tesseramenti</th>
                <th className="py-2 pr-4">Ruolo</th>
                <th className="py-2 pr-4">Stipendio</th>
              </tr>
            </thead>
            <tbody>
              {riepilogo.map((r) => (
                <tr key={r.telegram} className="border-b border-white/5">
                  <td className="py-2 pr-4">{r.telegram}</td>
                  <td className="py-2 pr-4">{r.tesseramenti}</td>
                  <td className="py-2 pr-4">{r.ruolo}</td>
                  <td className="py-2 pr-4 text-gold font-medium">{r.stipendio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Ruoli</h2>
        <ul className="space-y-1 text-sm">
          {ruoli.map((r) => (
            <li key={r.id} className="flex justify-between items-center bg-navy rounded-xl px-3 py-2">
              <span>{r.name} — {r.stipendio}/tesseramento</span>
              <button onClick={() => eliminaRuolo(r.id)} className="text-red-400 text-xs">
                Elimina
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Tesseramenti settimanali</h2>
          <input
            type="text"
            placeholder="Filtra per settimana (es. 2026-W38)"
            className="bg-navy border border-white/10 rounded-xl px-3 py-2 text-sm"
            value={settimana}
            onChange={(e) => setSettimana(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2 pr-4">Propagandista</th>
                <th className="py-2 pr-4">@Telegram propagandista</th>
                <th className="py-2 pr-4">Nome tesserato</th>
                <th className="py-2 pr-4">@Telegram tesserato</th>
                <th className="py-2 pr-4">Ruolo</th>
              </tr>
            </thead>
            <tbody>
              {tesseramenti.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-2 pr-4">{t.propagandista_username}</td>
                  <td className="py-2 pr-4">{t.propagandista_username}</td>
                  <td className="py-2 pr-4">{t.tesserato_nome}</td>
                  <td className="py-2 pr-4">{t.tesserato_telegram}</td>
                  <td className="py-2 pr-4">
                    <select
                      className="bg-navy border border-white/10 rounded-lg px-2 py-1"
                      value={t.ruolo_id || ""}
                      onChange={(e) => cambiaRuoloTesseramento(t.id, e.target.value)}
                    >
                      <option value="">-</option>
                      {ruoli.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modaleRuolo && (
        <Modal titolo="Crea ruolo" onClose={() => setModaleRuolo(false)}>
          <div className="space-y-3">
            <input
              placeholder="Nome ruolo"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={nomeRuolo}
              onChange={(e) => setNomeRuolo(e.target.value)}
            />
            <input
              type="number"
              placeholder="Stipendio per tesseramento"
              className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2"
              value={stipendioRuolo}
              onChange={(e) => setStipendioRuolo(e.target.value)}
            />
            <button onClick={creaRuolo} className="w-full bg-tgblue py-2 rounded-xl font-medium">
              Crea
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
