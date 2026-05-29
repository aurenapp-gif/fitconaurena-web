"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export default function MemberLogin({ error }: { error?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState(
    error ? "El enlace no es válido o ha caducado. Pide uno nuevo." : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/miembros/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Algo ha fallado. Inténtalo de nuevo.");
        return;
      }
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("No hemos podido conectar. Inténtalo de nuevo.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="max-w-md mx-auto rounded-xl border border-[#CAFF00]/40 bg-[#CAFF00]/5 px-6 py-5 text-center"
      >
        <p className="font-bold text-white mb-1">Revisa tu correo</p>
        <p className="text-sm text-[#A0A0A0]">
          Si tu email está dado de alta como miembro, te hemos enviado un enlace de acceso.
          Caduca en 15 minutos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          aria-label="Tu email"
          autoComplete="email"
          className="flex-1 rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-brand text-sm px-6 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Enviando…" : "Recibir acceso"}
        </button>
      </div>
      {(status === "error" || (error && status === "idle")) && (
        <p role="alert" className="mt-3 text-sm text-[#FF6B6B]">{message}</p>
      )}
      <p className="mt-4 text-xs text-[#666666]">
        Acceso solo para miembros del programa. Te enviaremos un enlace a tu correo.
      </p>
    </form>
  );
}
