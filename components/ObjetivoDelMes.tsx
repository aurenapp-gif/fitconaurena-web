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
  mes, etiqueta, progreso, minimo,
}: { mes: string; etiqueta: string; progreso: Progreso | null; minimo: number }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(progreso ? String(Math.round(progreso.objetivo / 100)) : "");
  const [ticket, setTicket] = useState(String(Math.round(minimo / 100)));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(quitar = false) {
    if (guardando) return;
    setGuardando(true); setError("");
    try {
      const res = await fetch("/api/miembros/contabilidad/objetivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, importe: quitar ? "" : valor, ticketMinimo: ticket }),
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

        <label className="block mt-4">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-1">
            Ticket mínimo
          </span>
          <input
            type="text" inputMode="numeric" value={ticket}
            onChange={(e) => setTicket(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            placeholder="1797" aria-label="Ticket mínimo, en euros"
            className="w-full sm:w-44 rounded-xl border border-line bg-page px-4 py-3 text-[17px] tabular-nums text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
          />
          <span className="block text-[13px] text-ink-subtle mt-1">
            Lo menos que puede pagar una clienta. Con esto se calcula cuántas faltan.
          </span>
        </label>
        {error && <p className="text-xs text-warn mt-2">{error}</p>}
      </div>
    );
  }

  const {
    objetivo, facturado, pct, falta, clientas, diasRestantes, porDia, proyeccion,
    anterior, pctAnterior, faltaAnterior, clientasAnterior, ticketMedio,
  } = progreso;
  const llegado = falta === 0;
  const vaBien = proyeccion >= objetivo;
  const superaAnterior = anterior > 0 && faltaAnterior === 0;

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

      {/* La barra, con la marca de lo que se facturó el mes pasado: ese listón
          es el que de verdad no se puede perder. */}
      <div className="relative h-3 rounded-full bg-surface-2" role="img"
        aria-label={`${pct} por ciento del objetivo de ${etiqueta}${anterior > 0 ? `, y el mes anterior quedó en el ${pctAnterior} por ciento` : ""}`}>
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${llegado ? "bg-success" : superaAnterior ? "bg-sage" : "bg-brand"}`}
            style={{ width: `${Math.max(pct, facturado > 0 ? 2 : 0)}%` }} />
        </div>
        {anterior > 0 && pctAnterior < 100 && (
          <span aria-hidden="true"
            className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-ink/45 rounded-full"
            style={{ left: `${pctAnterior}%` }} />
        )}
      </div>
      {anterior > 0 && (
        <p className="text-[13px] text-ink-muted mt-1.5">
          {superaAnterior ? (
            <span className="text-success font-semibold">
              Mes ganado: ya has superado los {textoEurosCorto(anterior)} del mes pasado.
            </span>
          ) : (
            <>
              La marca es el mes pasado ({textoEurosCorto(anterior)}). Para superarlo faltan{" "}
              <strong className="text-ink">{textoEurosCorto(faltaAnterior)}</strong>
              {clientasAnterior != null && clientasAnterior > 0 && <>, {clientasAnterior} {clientasAnterior === 1 ? "clienta" : "clientas"}</>}.
            </>
          )}
        </p>
      )}

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
          <p className="text-[13px] text-ink-subtle mt-2">
            La cuenta de clientas va con {textoEurosCorto(ticketMedio ?? minimo)} por contrato
            {ticketMedio != null && ticketMedio > minimo
              ? " (lo que estás cerrando últimamente, por encima de tu mínimo)."
              : ` (tu ticket mínimo). `}
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
