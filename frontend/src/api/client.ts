// api/client.ts
// Piccolo helper per chiamare le API del backend, con JWT allegato automaticamente

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Sessione scaduta");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errore || "Errore di rete");
  return data;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body?: any) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};

export async function loginConTelegram(datiTelegram: any) {
  const res = await fetch(`${API_URL}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datiTelegram),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errore || "Login fallito");
  localStorage.setItem("token", data.token);
  localStorage.setItem("utente", JSON.stringify(data.utente));
  return data;
}
