// components/Sidebar.tsx
// Sidebar fissa a sinistra con le 6 sezioni + logout

import { NavLink, useNavigate } from "react-router-dom";

const VOCI = [
  { path: "/", label: "Dashboard", icona: "🏠" },
  { path: "/permessi", label: "Permessi", icona: "🔑" },
  { path: "/propaganda", label: "Propaganda", icona: "📣" },
  { path: "/eventi", label: "Eventi", icona: "🎉" },
  { path: "/collaborazioni", label: "Collaborazioni", icona: "🤝" },
  { path: "/reminders", label: "Reminders", icona: "⏰" },
  { path: "/candidature", label: "Candidature", icona: "📋" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const utenteRaw = localStorage.getItem("utente");
  const utente = utenteRaw ? JSON.parse(utenteRaw) : null;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("utente");
    navigate("/login");
  }

  return (
    <aside className="w-64 bg-navycard flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-xl font-bold text-gold">Gestione Bot</h1>
        {utente && <p className="text-xs text-white/50 mt-1">👤 {utente.first_name || utente.username}</p>}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {VOCI.map((v) => (
          <NavLink
            key={v.path}
            to={v.path}
            end={v.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                isActive ? "bg-tgblue text-white font-medium" : "text-white/70 hover:bg-white/5"
              }`
            }
          >
            <span>{v.icona}</span>
            {v.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
