// components/Toast.tsx
// Notifica temporanea in basso a destra, per successo/errore

import { useEffect } from "react";

export interface ToastMsg {
  id: number;
  testo: string;
  tipo: "successo" | "errore";
}

export default function Toast({ toasts, rimuovi }: { toasts: ToastMsg[]; rimuovi: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100]">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => rimuovi(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDone }: { toast: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
        toast.tipo === "successo" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {toast.testo}
    </div>
  );
}
