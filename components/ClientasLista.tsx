"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coincide } from "@/lib/buscar";

export type FilaClienta = {
  email: string;
  name: string;
  renewalText: string;
  renewalUrgent: boolean;
  pct: number | null;
  daysUsed: number;
  checkins: number;
  plans: number;
  techniques: number;
  lastCheckin: string | null;
};

function fmtFecha(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

/**
 * Listado de clientas con buscador. Con veinte fichas ya cuesta encontrar a
 * alguien bajando; el filtro va por nombre y por correo, sin distinguir acentos.
 */
export default function ClientasLista({ filas }: { filas: FilaClienta[] }) {
  const [busca, setBusca] = useState("");

  const visibles = useMemo(
    () => filas.filter((f) => coincide(busca, f.name, f.email)),
    [filas, busca]
  );

  return (
    <>
      <div className="relative mb-4">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar clienta por nombre o correo…"
          aria-label="Buscar clienta"
          className="w-full rounded-xl border border-line bg-page pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
        />
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </div>

      {busca.trim() && (
        <p className="text-xs text-ink-subtle mb-3">
          {visibles.length === 0
            ? "Ninguna clienta coincide."
            : `${visibles.length} de ${filas.length}`}
        </p>
      )}

      <div className="grid gap-3">
        {visibles.map((r) => (
          <Link
            key={r.email}
            href={`/miembros/clientas/${encodeURIComponent(r.email)}`}
            className="card-dark p-4 !transform-none block"
          >
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink truncate">{r.name}</p>
                <p className="text-xs text-ink-subtle truncate">{r.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${r.renewalUrgent ? "bg-danger text-white" : "border border-line text-ink-muted"}`}>
                {r.renewalText}
              </span>
            </div>

            {r.pct != null && (
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-brand">
                    Servicio consumido
                  </span>
                  <span className="text-xs font-bold text-ink tabular-nums">{r.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-page overflow-hidden">
                  <div className="h-full bg-brand" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { v: r.daysUsed, l: "días de uso" },
                { v: r.checkins, l: "check-ins" },
                { v: r.plans, l: "planes" },
                { v: r.techniques, l: "vídeos" },
              ].map((c) => (
                <div key={c.l}>
                  <div className="text-lg font-extrabold text-ink leading-none">{c.v}</div>
                  <div className="text-[9px] text-ink-subtle mt-1 leading-tight">{c.l}</div>
                </div>
              ))}
            </div>

            {r.lastCheckin && (
              <p className="text-[10px] text-ink-subtle mt-3">Último check-in: {fmtFecha(r.lastCheckin)}</p>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
