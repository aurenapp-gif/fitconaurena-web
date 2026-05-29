"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/lead", {
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
      setMessage("No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  return (
    <section id="guia-gratis" className="relative py-24 md:py-32 overflow-hidden">
      <div className="container-content relative z-10">
        <div className="card-dark p-8 md:p-12 text-center !transform-none">
          <span className="section-tag">Guía gratuita</span>
          <h2 className="section-title mb-4">
            Descarga tu guía para <span className="text-[#CAFF00]">empezar hoy</span>
          </h2>
          <p className="section-sub mb-8 max-w-lg mx-auto">
            Nutrición y entrenamiento adaptados a tu ciclo, en una guía práctica.
            Déjanos tu email, confírmalo y te la enviamos al instante.
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="max-w-md mx-auto rounded-xl border border-[#CAFF00]/40 bg-[#CAFF00]/5 px-6 py-5"
            >
              <p className="font-bold text-white mb-1">📩 Revisa tu correo</p>
              <p className="text-sm text-[#A0A0A0]">
                Te hemos enviado un email para confirmar tu dirección. Pulsa el enlace
                y recibirás tu guía. ¿No lo ves? Mira en spam o promociones.
              </p>
            </div>
          ) : (
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
                  className="flex-1 rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] focus:border-[#CAFF00] focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-brand text-sm px-6 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Enviando…" : "Quiero la guía"}
                </button>
              </div>

              {status === "error" && (
                <p role="alert" className="mt-3 text-sm text-[#FF6B6B]">
                  {message}
                </p>
              )}

              <p className="mt-4 text-xs text-[#666666]">
                Sin spam. Te puedes dar de baja cuando quieras.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
