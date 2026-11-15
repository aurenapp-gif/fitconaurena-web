"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tareasDe, type Tarea } from "@/lib/tareas";

/**
 * Las tareas de hoy, para marcarlas.
 *
 * Van en el orden que marca la prioridad: la primera es la primera que hay
 * que hacer. No se reordenan solas al marcarlas —que una tarea salte de sitio
 * bajo el dedo es la forma más rápida de marcar la que no era—: se quedan
 * donde están y solo cambian de aspecto.
 */
export default function MisTareas({
  tareas, hechasHoy, email,
}: {
  tareas: Tarea[];
  hechasHoy: string[];
  email: string;
}) {
  const router = useRouter();
  const mias = tareasDe(tareas, email);
  const [hechas, setHechas] = useState<Set<string>>(new Set(hechasHoy));
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function alternar(id: string) {
    if (guardando) return;
    const estaba = hechas.has(id);
    setGuardando(id);
    setError("");
    // Se pinta ya y se corrige si falla: marcar una tarea tiene que ir seco.
    setHechas((s) => { const n = new Set(s); if (estaba) n.delete(id); else n.add(id); return n; });
    try {
      const res = await fetch("/api/miembros/tareas/hecho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hecha: !estaba }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo guardar.");
        setHechas((s) => { const n = new Set(s); if (estaba) n.add(id); else n.delete(id); return n; });
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de conexión. No se ha guardado.");
      setHechas((s) => { const n = new Set(s); if (estaba) n.add(id); else n.delete(id); return n; });
    } finally {
      setGuardando(null);
    }
  }

  if (mias.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] p-5">
        <p className="text-[17px]">No tienes tareas puestas.</p>
        <p className="text-[15px] text-ink-muted mt-1">Cuando te pongan alguna, aparecerá aquí cada día.</p>
      </div>
    );
  }

  const llevo = mias.filter((t) => hechas.has(t.id)).length;

  return (
    <>
      <div className="bg-surface rounded-[14px] px-4 py-3 mb-3 flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-ink-muted">Hoy</span>
        <span className="text-[17px] font-semibold tabular-nums">
          {llevo} de {mias.length}
        </span>
      </div>

      {error && <p role="alert" className="text-[15px] text-danger mb-3 px-1">{error}</p>}

      <div className="bg-surface rounded-[14px] px-4">
        {mias.map((t, i) => {
          const ok = hechas.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => alternar(t.id)}
              disabled={guardando === t.id}
              aria-pressed={ok}
              className={`w-full flex items-start gap-3 py-3.5 text-left min-h-[56px] ${i ? "border-t border-line" : ""} ${guardando === t.id ? "opacity-60" : ""}`}
            >
              <span aria-hidden="true" className={`w-[24px] h-[24px] rounded-[7px] shrink-0 grid place-items-center mt-0.5 ${
                ok ? "bg-sage text-white" : "border-2 border-line"}`}>
                {ok && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4.5 4.5L19 7" />
                  </svg>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[17px] font-semibold ${ok ? "text-ink-muted line-through" : ""}`}>
                  {t.titulo}
                </span>
                {t.detalle && <span className="block text-[15px] text-ink-muted mt-0.5">{t.detalle}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[13px] text-ink-subtle mt-3 px-1">
        Se marcan cada día. Mañana vuelven a salir sin marcar.
      </p>
    </>
  );
}
