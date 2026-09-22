// pages/Login.tsx
// Login tramite Telegram Login Widget

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginConTelegram } from "../api/client";

// Nome utente del bot (senza @), serve al widget per sapere quale bot usare per il login.
// Va configurato anche con /setdomain su BotFather (vedi README).
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "il_tuo_bot";

declare global {
  interface Window {
    onTelegramAuth: (user: any) => void;
  }
}

export default function Login() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      setCaricamento(true);
      setErrore("");
      try {
        await loginConTelegram(user);
        navigate("/");
      } catch (e: any) {
        setErrore(e.message || "Errore durante il login.");
      } finally {
        setCaricamento(false);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    containerRef.current?.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="bg-navycard rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🤖</div>
        <h1 className="text-2xl font-bold text-gold mb-1">Gestione Bot</h1>
        <p className="text-white/60 text-sm mb-8 tracking-wide">ACCEDI CON TELEGRAM</p>

        {caricamento && <p className="text-white/70 text-sm mb-4">Verifica in corso...</p>}
        {errore && <p className="text-red-400 text-sm mb-4">{errore}</p>}

        <div ref={containerRef} className="flex justify-center" />
      </div>
    </div>
  );
}
