// components/Layout.tsx
// Layout generale del pannello: sidebar + contenuto pagina

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 p-6 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
