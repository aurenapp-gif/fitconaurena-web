"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export default function MemberLogin({ error }: { error?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState(
    error ? "El enlace no es válido o ha caducado. Pide uno nuevo." : ""
  );
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "loading" | "error">("idle");
  const [codeMsg, setCodeMsg] = useState("");

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
      setStatus("sent"); // mantenemos el email para verificar el código
    } catch {
      setStatus("error");
      setMessage("No hemos podido conectar. Inténtalo de nuevo.");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (codeStatus === "loading") return;
    setCodeStatus("loading");
    setCodeMsg("");
    try {
      const res = await fetch("/api/miembros/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeStatus("error");
        setCodeMsg(data.error ?? "Código incorrecto.");
        return;
      }
      window.location.href = "/miembros";
    } catch {
      setCodeStatus("error");
      setCodeMsg("No hemos podido conectar.");
    }
  }

  if (status === "sent") {
    return (
      <div className="max-w-md mx-auto">
        <div role="status" className="rounded-xl border border-brand/40 bg-brand/5 px-6 py-5 text-center mb-5">
          <p className="font-bold text-ink mb-1">Revisa tu correo 📩</p>
          <p className="text-sm text-ink-muted">
            Te hemos enviado un <strong className="text-ink">enlace</strong> (para el navegador) y un
            <strong className="text-ink"> código</strong> (para la app). Caducan en 15 minutos.
          </p>
        </div>
        <form onSubmit={verifyCode}>
          <p className="text-sm text-ink-muted mb-2 text-center">¿Usas la app? Escribe aquí tu código:</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              aria-label="Código de acceso"
              className="flex-1 rounded-xl border border-line bg-page px-4 py-3.5 text-center text-lg tracking-[0.4em] text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
            />
            <button type="submit" disabled={codeStatus === "loading" || code.length !== 6}
              className="btn-brand text-sm px-6 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed">
              {codeStatus === "loading" ? "Entrando…" : "Entrar"}
            </button>
          </div>
          {codeStatus === "error" && <p role="alert" className="mt-3 text-sm text-danger">{codeMsg}</p>}
          <button type="button" onClick={() => { setStatus("idle"); setCode(""); }} className="mt-4 text-xs text-ink-subtle hover:text-ink">
            ← Usar otro email
          </button>
        </form>
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
          className="flex-1 rounded-xl border border-line bg-page px-4 py-3.5 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand transition-colors"
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
        <p role="alert" className="mt-3 text-sm text-danger">{message}</p>
      )}
      <p className="mt-4 text-xs text-ink-subtle">
        Acceso solo para miembros. Te enviamos un enlace y un código a tu correo.
      </p>
    </form>
  );
}
