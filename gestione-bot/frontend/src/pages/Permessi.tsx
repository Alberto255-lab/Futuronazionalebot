// pages/Permessi.tsx
// Gestione gruppi, membri e permessi + site_admins

import { useEffect, useState } from "react";
import Card from "../components/Card";
import { api } from "../api/client";
import { ToastMsg } from "../components/Toast";

export default function Permessi({ notifica }: { notifica: (t: string, tipo?: ToastMsg["tipo"]) => void }) {
  const [gruppi, setGruppi] = useState<any[]>([]);
  const [gruppoSel, setGruppoSel] = useState<number | null>(null);
  const [membri, setMembri] = useState<any[]>([]);
  const [permessi, setPermessi] = useState<any[]>([]);
  const [siteAdmins, setSiteAdmins] = useState<any[]>([]);
  const [nuovoAdminId, setNuovoAdminId] = useState("");
  const [nuovoMembroId, setNuovoMembroId] = useState("");

  useEffect(() => {
    api.get("/api/permissions/groups").then(setGruppi);
    api.get("/api/permissions/permissions").then(setPermessi);
    api.get("/api/permissions/site-admins").then(setSiteAdmins);
  }, []);

  useEffect(() => {
    if (gruppoSel) caricaMembri(gruppoSel);
  }, [gruppoSel]);

  function caricaMembri(groupId: number) {
    api.get(`/api/permissions/groups/${groupId}/members`).then(setMembri);
  }

  async function aggiungiMembro() {
    if (!gruppoSel || !nuovoMembroId) return;
    try {
      await api.post("/api/permissions/groups/members", { user_id: Number(nuovoMembroId), group_id: gruppoSel });
      setNuovoMembroId("");
      caricaMembri(gruppoSel);
      notifica("Membro aggiunto.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  async function togglePermesso(memberId: number, permessiAttuali: string[], codice: string) {
    const nuovi = permessiAttuali.includes(codice)
      ? permessiAttuali.filter((c) => c !== codice)
      : [...permessiAttuali, codice];
    const ids = permessi.filter((p) => nuovi.includes(p.code)).map((p) => p.id);
    await api.put(`/api/permissions/groups/members/${memberId}/permissions`, { permission_ids: ids });
    if (gruppoSel) caricaMembri(gruppoSel);
  }

  async function aggiungiAdmin() {
    if (!nuovoAdminId) return;
    try {
      await api.post("/api/permissions/site-admins", { telegram_id: Number(nuovoAdminId) });
      setNuovoAdminId("");
      api.get("/api/permissions/site-admins").then(setSiteAdmins);
      notifica("Site admin aggiunto.");
    } catch (e: any) {
      notifica(e.message, "errore");
    }
  }

  async function rimuoviAdmin(id: number) {
    await api.delete(`/api/permissions/site-admins/${id}`);
    api.get("/api/permissions/site-admins").then(setSiteAdmins);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Permessi</h1>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Gruppi e membri</h2>
        <select
          className="bg-navy border border-white/10 rounded-xl px-3 py-2 mb-4 w-full max-w-sm"
          value={gruppoSel || ""}
          onChange={(e) => setGruppoSel(Number(e.target.value) || null)}
        >
          <option value="">Seleziona un gruppo...</option>
          {gruppi.map((g) => (
            <option key={g.telegram_chat_id} value={g.telegram_chat_id}>
              {g.title}
            </option>
          ))}
        </select>

        {gruppoSel && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                placeholder="ID Telegram utente da aggiungere"
                className="bg-navy border border-white/10 rounded-xl px-3 py-2 flex-1 max-w-xs"
                value={nuovoMembroId}
                onChange={(e) => setNuovoMembroId(e.target.value)}
              />
              <button onClick={aggiungiMembro} className="bg-tgblue px-4 py-2 rounded-xl text-sm font-medium">
                Aggiungi membro
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/50 border-b border-white/10">
                    <th className="py-2 pr-4">Utente</th>
                    {permessi.map((p) => (
                      <th key={p.id} className="py-2 pr-4">
                        {p.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {membri.map((m) => {
                    const permessiAttuali: string[] = m.permessi ? m.permessi.split(",") : [];
                    return (
                      <tr key={m.member_id} className="border-b border-white/5">
                        <td className="py-2 pr-4">{m.username ? `@${m.username}` : m.user_id}</td>
                        {permessi.map((p) => (
                          <td key={p.id} className="py-2 pr-4">
                            <input
                              type="checkbox"
                              checked={permessiAttuali.includes(p.code)}
                              onChange={() => togglePermesso(m.member_id, permessiAttuali, p.code)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Site admin (accesso al pannello)</h2>
        <div className="flex gap-2 mb-4">
          <input
            placeholder="ID Telegram"
            className="bg-navy border border-white/10 rounded-xl px-3 py-2 flex-1 max-w-xs"
            value={nuovoAdminId}
            onChange={(e) => setNuovoAdminId(e.target.value)}
          />
          <button onClick={aggiungiAdmin} className="bg-tgblue px-4 py-2 rounded-xl text-sm font-medium">
            Aggiungi
          </button>
        </div>
        <ul className="space-y-1 text-sm">
          {siteAdmins.map((a) => (
            <li key={a.telegram_id} className="flex justify-between items-center bg-navy rounded-xl px-3 py-2">
              {a.telegram_id}
              <button onClick={() => rimuoviAdmin(a.telegram_id)} className="text-red-400 text-xs">
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
