"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Recuento } from "@/lib/votaciones";

/**
 * Votación de un comunicado.
 *
 * La clienta ve los botones y, en cuanto vota, el resultado. Puede cambiar su
 * voto: se pulsa otra opción y ya está. La coach ve además QUIÉN ha votado cada
 * cosa, que para decidir un día de llamada es justo el dato que hace falta —y
 * por eso se le avisa a la clienta, para que no lo descubra después.
 */
export default function AnnouncementPoll({
  id, filas, total, miVoto, cerrada, admin, sinVotar,
}: {
  id: string;
  filas: Recuento[];
  total: number;
  /** Índice de la opción que votó quien mira, o null. */
  miVoto: number | null;
  cerrada: boolean;
  admin: boolean;
  /** Nombres de quienes aún no han votado (solo para la coach). */
  sinVotar: string[];
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function votar(opcion: number) {
    if (enviando !== null || cerrada) return;
    setEnviando(opcion); setError("");
    try {
      const res = await fetch("/api/miembros/comunicados/voto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, option: opcion }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo guardar tu voto.");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setEnviando(null);
    }
  }

  async function cerrar(valor: boolean) {
    try {
      const res = await fetch("/api/miembros/comunicados/voto", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, cerrar: valor }),
      });
      if (res.ok) router.refresh();
    } catch { /* si falla, se queda como estaba */ }
  }

  // Se enseña el resultado a quien ya votó, a la coach, y cuando está cerrada.
  const verResultado = miVoto !== null || admin || cerrada;

  return (
    <div className="mt-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          🗳️ {cerrada ? "Votación cerrada" : "Vota"}
        </p>
        <span className="text-[11px] text-ink-subtle">
          {total} {total === 1 ? "voto" : "votos"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {filas.map((f) => {
          const mia = miVoto === f.indice;
          return (
            <button
              key={f.indice}
              type="button"
              onClick={() => votar(f.indice)}
              disabled={cerrada || enviando !== null}
              aria-pressed={mia}
              className={`relative overflow-hidden text-left rounded-lg border px-3 py-2 transition-colors disabled:cursor-default ${
                mia ? "border-brand bg-brand/10" : "border-line bg-page hover:border-brand/60"
              }`}
            >
              {/* Barra de fondo con el porcentaje. Detrás del texto, no encima. */}
              {verResultado && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-brand/15"
                  style={{ width: `${f.pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-sm text-ink">
                  {mia && "✓ "}{f.opcion}
                </span>
                {verResultado && (
                  <span className="text-xs font-bold text-brand shrink-0 tabular-nums">
                    {f.votos} · {f.pct}%
                  </span>
                )}
              </span>
              {admin && f.quienes.length > 0 && (
                <span className="relative block text-[10px] text-ink-subtle mt-1">{f.quienes.join(" · ")}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="text-xs text-danger mt-2">{error}</p>}

      {!admin && !cerrada && (
        <p className="text-[10px] text-ink-subtle mt-2">
          {miVoto === null ? "Elige una opción." : "Puedes cambiar tu voto pulsando otra."} Tu coach ve quién ha votado cada cosa.
        </p>
      )}

      {admin && (
        <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-line">
          <button type="button" onClick={() => cerrar(!cerrada)} className="btn-outline text-xs px-4 py-2">
            {cerrada ? "Reabrir votación" : "Cerrar votación"}
          </button>
          {sinVotar.length > 0 && (
            <span className="text-[10px] text-ink-subtle">
              Sin votar ({sinVotar.length}): {sinVotar.join(" · ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
