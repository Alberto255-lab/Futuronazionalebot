// App.tsx
// Routing principale dell'applicazione

import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Permessi from "./pages/Permessi";
import Propaganda from "./pages/Propaganda";
import Eventi from "./pages/Eventi";
import Collaborazioni from "./pages/Collaborazioni";
import Reminders from "./pages/Reminders";
import Candidature from "./pages/Candidature";
import Toast, { ToastMsg } from "./components/Toast";

function PaginaProtetta({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  function notifica(testo: string, tipo: ToastMsg["tipo"] = "successo") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, testo, tipo }]);
  }
  function rimuoviToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <BrowserRouter>
      <Toast toasts={toasts} rimuovi={rimuoviToast} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PaginaProtetta>
              <Layout />
            </PaginaProtetta>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="permessi" element={<Permessi notifica={notifica} />} />
          <Route path="propaganda" element={<Propaganda notifica={notifica} />} />
          <Route path="eventi" element={<Eventi notifica={notifica} />} />
          <Route path="collaborazioni" element={<Collaborazioni notifica={notifica} />} />
          <Route path="reminders" element={<Reminders notifica={notifica} />} />
          <Route path="candidature" element={<Candidature notifica={notifica} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
