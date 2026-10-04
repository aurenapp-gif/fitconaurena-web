"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SinSubir = {
  email: string;
  nombre: string;
  /** Cuándo se le recordó por última vez esta quincena, si se le recordó. */
  recordada: string | null;
};

/**
 * A quién le falta la revisión de esta quincena, y el botón para recordárselo.
 *
 * El recordatorio va por correo y por notificación al móvil. Se puede mandar a
 * una sola o a todas: en una quincena normal son dos o tres, pero el día 15 por
 * la mañana son veinte y nadie va a pulsar veinte veces.
 */
export default function RecordarRevision({ pendientes }: { pendientes: SinSubir[] }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);

  async function recordar(emails: string[], etiqueta: string) {
    if (enviando) return;
    if (emails.length > 1 && !confirm(`¿Mandar el recordatorio a ${emails.length} clientas?`)) return;
    setEnviando(etiqueta); setMsg(""); setError(false);
    try {
      const res = await fetch("/api/miembros/checkins/recordar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(true); setMsg(d.error ?? "No se pudo enviar."); return; }

      const partes = [
        d.enviados > 0 ? `Recordatorio enviado a ${d.enviados}` : null,
        d.yaLaSubieron > 0 ? `${d.yaLaSubieron} ya la había subido` : null,
        d.fallidos?.length > 0 ? `${d.fallidos.length} sin enviar` : null,
      ].filter(Boolean);
      setError(d.fallidos?.length > 0);
      setMsg(partes.join(" · ") || "No hacía falta: ya estaban todas.");
      router.refresh();
    } catch { setError(true); setMsg("Error de conexión."); }
    finally { setEnviando(null); }
  }

  if (pendientes.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">
          Sin subir ({pendientes.length})
        </p>
        <button type="button" disabled={!!enviando}
          onClick={() => recordar(pendientes.map((p) => p.email), "todas")}
          className="btn-outline text-xs px-4 py-2 disabled:opacity-50">
          {enviando === "todas" ? "Enviando…" : `Recordar a las ${pendientes.length}`}
        </button>
      </div>

      <div className="rounded-xl bg-page divide-y divide-line">
        {pendientes.map((p) => (
          <div key={p.email} className="flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink truncate">{p.nombre}</span>
              {p.recordada && (
                <span className="block text-[12px] text-ink-subtle">Recordado {p.recordada}</span>
              )}
            </span>
            <button type="button" disabled={!!enviando}
              onClick={() => recordar([p.email], p.email)}
              className="shrink-0 text-xs text-brand px-2 min-h-[36px] disabled:opacity-50">
              {enviando === p.email ? "…" : p.recordada ? "Volver a recordar" : "Recordar"}
            </button>
          </div>
        ))}
      </div>

      {msg && <p className={`text-xs mt-2 ${error ? "text-warn" : "text-brand"}`}>{msg}</p>}
    </div>
  );
}
