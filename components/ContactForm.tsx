"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(34,197,94,0.06)", border: "2px solid rgba(34,197,94,0.2)" }}>
        <div className="text-5xl mb-4">✅</div>
        <h3 className="font-bold text-ink text-xl mb-2">¡Mensaje enviado!</h3>
        <p className="text-sm text-ink-muted">Te respondemos en menos de 24 horas.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-soft">Nombre</label>
          <input type="text" required placeholder="Tu nombre" className="w-full px-4 py-3 rounded-xl text-sm border text-ink" style={{ background: "#F5F3EF", borderColor: "#E5E7EB" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-soft">Email</label>
          <input type="email" required placeholder="tu@email.com" className="w-full px-4 py-3 rounded-xl text-sm border text-ink" style={{ background: "#F5F3EF", borderColor: "#E5E7EB" }} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-soft">Asunto</label>
        <select required className="w-full px-4 py-3 rounded-xl text-sm border text-ink" style={{ background: "#F5F3EF", borderColor: "#E5E7EB" }}>
          <option value="">Selecciona un motivo</option>
          <option value="duda">Duda sobre el programa</option>
          <option value="precios">Precios y planes</option>
          <option value="tecnico">Problema técnico</option>
          <option value="cancelacion">Cancelación o reembolso</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-soft">Mensaje</label>
        <textarea required rows={5} placeholder="Cuéntanos en qué podemos ayudarte..." className="w-full px-4 py-3 rounded-xl text-sm border text-ink resize-none" style={{ background: "#F5F3EF", borderColor: "#E5E7EB" }} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-60">
        {loading ? "Enviando..." : (<>Enviar mensaje <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>)}
      </button>
      <p className="text-xs text-center text-ink-muted">Al enviar aceptas nuestra <a href="/privacidad" className="hover:underline">política de privacidad</a>.</p>
    </form>
  );
}
