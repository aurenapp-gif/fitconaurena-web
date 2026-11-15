"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { porPrioridad, MAX_TITULO, MAX_DETALLE, type Tarea } from "@/lib/tareas";

type Quien = { email: string; nombre: string };

/**
 * Poner las tareas del equipo, ordenarlas y ver quién lleva qué hoy.
 *
 * El orden es el mensaje: la primera de la lista es la primera que hay que
 * hacer. Por eso se mueve con flechas y no arrastrando: en el móvil arrastrar
 * falla, y esto se mira y se toca desde el móvil.
 */
export default function TareasEquipo({
  tareas, equipo, hechasHoy,
}: {
  tareas: Tarea[];
  equipo: Quien[];
  /** Quién ha marcado qué hoy: id de tarea → correos. */
  hechasHoy: Record<string, string[]>;
}) {
  const router = useRouter();
  const lista = porPrioridad(tareas.filter((t) => t.activa));
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [quien, setQuien] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  // La misma caja que el resto de formularios del equipo.
  const campo = "w-full rounded-xl border border-line bg-page px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  const nombreDe = (email: string) => equipo.find((q) => q.email === email)?.nombre ?? email;

  async function llamar(init: RequestInit, url = "/api/miembros/tareas") {
    setError("");
    setOcupado(true);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Error de conexión.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crear() {
    if (!titulo.trim() || ocupado) return;
    const ok = await llamar({
      method: "POST",
      body: JSON.stringify({ titulo, detalle, asignado_a: quien }),
    });
    if (ok) { setTitulo(""); setDetalle(""); }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {lista.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no hay tareas. Escribe la primera abajo.</p>
      ) : (
        <div className="bg-surface rounded-[14px] divide-y divide-line">
          {lista.map((t, i) => {
            const marcada = hechasHoy[t.id] ?? [];
            return (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{i + 1}. {t.titulo}</p>
                    {t.detalle && <p className="text-[13px] text-ink-muted mt-0.5">{t.detalle}</p>}
                    <p className="text-xs text-ink-subtle mt-1">
                      {t.asignado_a ? nombreDe(t.asignado_a) : "Todo el equipo"}
                      {marcada.length > 0
                        ? ` · hoy la ha hecho ${marcada.map(nombreDe).join(", ")}`
                        : " · hoy sin marcar"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" aria-label="Subir" disabled={i === 0 || ocupado}
                      onClick={() => llamar({ method: "PATCH", body: JSON.stringify({ id: t.id, mover: "sube" }) })}
                      className="w-8 h-8 rounded-lg border border-line text-ink-muted disabled:opacity-30">↑</button>
                    <button type="button" aria-label="Bajar" disabled={i === lista.length - 1 || ocupado}
                      onClick={() => llamar({ method: "PATCH", body: JSON.stringify({ id: t.id, mover: "baja" }) })}
                      className="w-8 h-8 rounded-lg border border-line text-ink-muted disabled:opacity-30">↓</button>
                    <button type="button" disabled={ocupado}
                      onClick={() => {
                        if (confirm(`¿Retirar «${t.titulo}»?\n\nDeja de salirles. Lo que ya hayan marcado se conserva.`)) {
                          llamar({ method: "DELETE" }, `/api/miembros/tareas?id=${t.id}`);
                        }
                      }}
                      className="text-xs text-danger px-2 min-h-[32px]">Retirar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-surface rounded-[14px] p-4 flex flex-col gap-2">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={MAX_TITULO}
          placeholder="Qué hay que hacer" className={campo} />
        <input value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={MAX_DETALLE}
          placeholder="Detalle (opcional)" className={campo} />
        <div className="flex gap-2 flex-wrap">
          <select value={quien} onChange={(e) => setQuien(e.target.value)}
            className="text-sm border border-line rounded-lg px-2 py-2 bg-page text-ink flex-1 min-w-[150px]">
            <option value="">Todo el equipo</option>
            {equipo.map((q) => <option key={q.email} value={q.email}>{q.nombre}</option>)}
          </select>
          <button type="button" onClick={crear} disabled={!titulo.trim() || ocupado}
            className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">
            {ocupado ? "Un momento…" : "Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}
