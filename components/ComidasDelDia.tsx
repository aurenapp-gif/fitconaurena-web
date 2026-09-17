"use client";

import Link from "next/link";
import { useState } from "react";

export type FilaComida = {
  clave: string;
  nombre: string;
  momento: string;
  resumen: string;
  hecha: boolean;
};

/**
 * Las comidas de hoy, marcables desde el inicio.
 *
 * Se marca en el sitio y sin esperar: el tic cambia al tocarlo y la petición
 * va por detrás. Si falla, vuelve atrás y se dice. Nadie va a mirar si se ha
 * guardado su desayuno antes de irse a trabajar.
 */
export default function ComidasDelDia({ comidas, puedeMarcar = true }: { comidas: FilaComida[]; puedeMarcar?: boolean }) {
  const [hechas, setHechas] = useState<Record<string, boolean>>(
    Object.fromEntries(comidas.map((c) => [c.clave, c.hecha]))
  );
  const [error, setError] = useState("");

  async function alternar(c: FilaComida) {
    const nueva = !hechas[c.clave];
    setHechas((h) => ({ ...h, [c.clave]: nueva }));
    setError("");
    try {
      const res = await fetch("/api/miembros/comidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comida: c.nombre, hecha: nueva }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setHechas((h) => ({ ...h, [c.clave]: !nueva }));
      setError("No se ha podido guardar. Inténtalo otra vez.");
    }
  }

  return (
    <>
      <div className="bg-surface rounded-[14px] px-4">
        {comidas.map((c, i) => {
          const hecha = hechas[c.clave];
          return (
            <div key={c.clave} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
              {puedeMarcar && (
                <button
                  type="button"
                  onClick={() => alternar(c)}
                  aria-pressed={hecha}
                  aria-label={`${c.nombre}: ${hecha ? "quitar de hechas" : "marcar como hecha"}`}
                  className={`w-[26px] h-[26px] rounded-full shrink-0 grid place-items-center ${
                    hecha ? "bg-sage text-white" : "border-2 border-line"}`}
                >
                  {hecha && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                  )}
                </button>
              )}
              <Link href={`/miembros/comida/${encodeURIComponent(c.clave)}`} className="flex-1 min-w-0 py-1">
                <span className="flex items-baseline gap-2">
                  <span className={`text-[17px] font-semibold ${hecha ? "text-ink-muted line-through" : "text-ink"}`}>{c.nombre}</span>
                  {c.momento && <span className="text-[13px] text-ink-subtle">{c.momento}</span>}
                </span>
                <span className="block text-[15px] text-ink-muted truncate">{c.resumen}</span>
              </Link>
              <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle shrink-0" aria-hidden="true">
                <path d="M1.5 1.5L7 7.5l-5.5 6" />
              </svg>
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="text-[13px] text-danger px-1 mt-1">{error}</p>}
    </>
  );
}
