"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coincide } from "@/lib/buscar";

export type FichaBusqueda = { email: string; nombre: string; revisiones: number; ultima: string | null };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

/**
 * Buscador de clienta dentro de las revisiones.
 *
 * Al elegir una se navega a `?clienta=<correo>`, no se filtra en pantalla: así
 * el servidor puede traerse su historial ENTERO. La lista general solo trae las
 * últimas cincuenta de todas, que para comparar sesiones de una misma clienta
 * se queda corta en cuanto lleva unos meses.
 */
export default function CheckinsBuscador({ fichas }: { fichas: FichaBusqueda[] }) {
  const [busca, setBusca] = useState("");

  const visibles = useMemo(
    () => fichas.filter((f) => coincide(busca, f.nombre, f.email)),
    [fichas, busca]
  );

  return (
    <div className="card-dark p-5 !transform-none mb-8">
      <h2 className="font-bold text-ink mb-1">Ver las revisiones de una clienta</h2>
      <p className="text-xs text-ink-subtle mb-4">
        Elige a una y verás solo las suyas, en orden, con lo que sube y lo que baja en cada sesión.
      </p>

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
          {visibles.length === 0 ? "Ninguna clienta coincide." : `${visibles.length} de ${fichas.length}`}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {visibles.map((f) => (
          <Link
            key={f.email}
            href={`/miembros/checkins?clienta=${encodeURIComponent(f.email)}`}
            className="rounded-lg border border-line bg-page px-4 py-2.5 hover:border-brand transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink truncate">{f.nombre}</span>
              <span className="text-xs text-ink-subtle shrink-0">
                {f.revisiones} {f.revisiones === 1 ? "revisión" : "revisiones"}
              </span>
            </div>
            {f.ultima && <p className="text-[10px] text-ink-subtle mt-0.5">Última: {fmt(f.ultima)}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
