"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot anti-bots
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
        body: JSON.stringify({ email, website }),
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
    <section
      id="contenido-gratis"
      className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
      />

      <div className="container-content relative z-10 py-16">
        <div className="card-dark p-8 md:p-12 text-center !transform-none">
          <span className="section-tag">Contenido gratuito</span>
          <h2 className="section-title mb-4">
            Accede a <span className="text-[#CAFF00]">contenido gratuito</span>
          </h2>
          <p className="section-sub mb-8 max-w-lg mx-auto">
            Todo lo que debes saber para poder llevar tu físico y mentalidad al
            siguiente nivel. Déjanos tu email, confírmalo y tendrás acceso al instante.
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="max-w-md mx-auto rounded-xl border border-[#CAFF00]/40 bg-[#CAFF00]/5 px-6 py-5"
            >
              <p className="flex items-center justify-center gap-2 font-bold text-white mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CAFF00" strokeWidth="2.2" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                Revisa tu correo
              </p>
              <p className="text-sm text-[#A0A0A0]">
                Te hemos enviado un email para confirmar tu dirección. Pulsa el enlace
                y tendrás acceso a tu contenido. ¿No lo ves? Mira en spam o promociones.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              {/* Honeypot: oculto para humanos, los bots lo rellenan */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  aria-label="Tu email"
                  autoComplete="email"
                  className="flex-1 rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] focus-visible:ring-2 focus-visible:ring-[#CAFF00]/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-brand text-sm px-6 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Enviando…" : "Quiero el contenido"}
                </button>
              </div>

              {status === "error" && (
                <p role="alert" className="mt-3 text-sm text-[#FF6B6B]">
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
