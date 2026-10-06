"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Progreso } from "@/lib/objetivos";
import { textoEurosCorto } from "@/lib/contabilidad";

/**
 * La barra del objetivo del mes.
 *
 * Enseña tres cosas y en este orden, porque es el orden en que sirven: cuánto
 * falta, cuántas clientas son eso, y cuántos días quedan. El porcentaje es lo
 * de menos: nadie firma un contrato porque vaya por el 6 %.
 *
 * El objetivo se cambia aquí mismo. Cada mes guarda el suyo.
 */
export default function ObjetivoDelMes({
  mes, etiqueta, progreso,
}: { mes: string; etiqueta: string; progreso: Progreso | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(progreso ? String(Math.round(progreso.objetivo / 100)) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(quitar = false) {
    if (guardando) return;
    setGuardando(true); setError("");
    try {
      const res = await fetch("/api/miembros/contabilidad/objetivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, importe: quitar ? "" : valor }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "No se pudo guardar."); return; }
      setEditando(false);
      router.refresh();
    } catch { setError("Error de conexión."); }
    finally { setGuardando(false); }
  }

  if (!progreso || editando) {
    return (
      <div className="bg-surface rounded-[14px] px-4 py-4 mb-6">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-2">
          Objetivo de {etiqueta}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text" inputMode="numeric" value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
            placeholder="30000" aria-label={`Objetivo de facturación de ${etiqueta}, en euros`}
            className="flex-1 rounded-xl border border-line bg-page px-4 py-3 text-[17px] tabular-nums text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
          />
          <button type="button" onClick={() => guardar()} disabled={guardando || !valor}
            className="btn-brand text-sm px-6 py-3 disabled:opacity-50">
            {guardando ? "Guardando…" : "Poner objetivo"}
          </button>
          {progreso && (
            <button type="button" onClick={() => setEditando(false)} className="text-sm text-ink-muted px-3 min-h-[44px]">
              Cancelar
            </button>
          )}
        </div>
        <p className="text-[13px] text-ink-subtle mt-2">
          En euros, sin puntos. Es la facturación que quieres cerrar este mes.
        </p>
        {error && <p className="text-xs text-warn mt-2">{error}</p>}
      </div>
    );
  }

  const { objetivo, facturado, pct, falta, clientas, diasRestantes, porDia, proyeccion } = progreso;
  const llegado = falta === 0;
  const vaBien = proyeccion >= objetivo;

  return (
    <div className="bg-surface rounded-[14px] px-4 py-4 mb-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
          Objetivo de {etiqueta} · {textoEurosCorto(objetivo)}
        </p>
        <button type="button" onClick={() => setEditando(true)} className="text-[13px] text-brand min-h-[32px]">
          Cambiar
        </button>
      </div>

      <div className="flex items-end justify-between gap-3 mb-2">
        <p className="text-[30px] font-bold tracking-tight tabular-nums leading-none">{textoEurosCorto(facturado)}</p>
        <p className={`text-[15px] font-semibold tabular-nums ${llegado ? "text-success" : "text-ink-muted"}`}>{pct} %</p>
      </div>

      <div className="h-3 rounded-full bg-surface-2 overflow-hidden" role="img"
        aria-label={`${pct} por ciento del objetivo de ${etiqueta}`}>
        <div className={`h-full rounded-full transition-all ${llegado ? "bg-success" : "bg-brand"}`}
          style={{ width: `${Math.max(pct, facturado > 0 ? 2 : 0)}%` }} />
      </div>

      {llegado ? (
        <p className="text-[15px] text-success font-semibold mt-3">
          Objetivo cumplido. Lo que entre a partir de aquí va por encima.
        </p>
      ) : (
        <>
          <p className="text-[17px] text-ink mt-3 leading-snug">
            Faltan <strong>{textoEurosCorto(falta)}</strong>
            {clientas != null && <> · unas <strong>{clientas} {clientas === 1 ? "clienta" : "clientas"}</strong></>}
            {diasRestantes > 0 && <> · quedan <strong>{diasRestantes} {diasRestantes === 1 ? "día" : "días"}</strong></>}
          </p>
          <p className="text-[13px] text-ink-muted mt-1">
            {diasRestantes > 0
              ? `Son ${textoEurosCorto(porDia)} al día. `
              : "Se acabó el mes. "}
            {vaBien
              ? "Al ritmo que llevas, se llega."
              : `Al ritmo que llevas, el mes cierra en ${textoEurosCorto(proyeccion)}.`}
          </p>
        </>
      )}
    </div>
  );
}
