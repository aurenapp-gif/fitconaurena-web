import { fraseEntreno, resumenEntreno, textoSerie, type Progreso } from "@/lib/entreno";

/**
 * Cómo va el entrenamiento: ejercicio a ejercicio, comparado con la revisión
 * anterior, y arriba en cuáles progresa más y en cuáles menos.
 *
 * Verde salvia para lo que sube; gris para lo que se mantiene o baja. Bajar
 * en un ejercicio no se pinta en rojo: puede ser una semana floja, una
 * técnica que se está corrigiendo o simplemente el ciclo. Presentacional.
 */
export default function EntrenoProgreso({ progreso, compacto = false }: { progreso: Progreso[]; compacto?: boolean }) {
  if (progreso.length === 0) return null;
  const r = resumenEntreno(progreso);
  // Con el menos tipográfico («−10 %»), no el guion.
  const pctTxt = (p: number | null) => p == null ? "" : `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
  const tono = (e: Progreso["estado"]) => e === "sube" ? "text-success" : e === "baja" ? "text-warn" : "text-ink-subtle";

  return (
    <div className="flex flex-col divide-y divide-line">
      {!compacto && (
        <div className="px-4 py-3">
          <p className="text-[17px] text-ink">{fraseEntreno(r)}</p>
          {r.comparables > 0 && (
            <p className="text-[13px] text-ink-muted mt-0.5">
              {r.suben} {r.suben === 1 ? "sube" : "suben"} · {r.igual} igual · {r.bajan} {r.bajan === 1 ? "baja" : "bajan"}, frente a la revisión anterior.
            </p>
          )}
        </div>
      )}
      {r.mejores.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[13px] text-ink-muted mb-1">Donde más progresas</p>
          <div className="flex flex-col gap-1">
            {r.mejores.map((e) => (
              <div key={e.name} className="flex items-center justify-between gap-3 text-[15px]">
                <span className="text-ink truncate">{e.name}</span>
                <span className="text-success shrink-0">{pctTxt(e.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {r.peores.length > 0 && r.comparables > r.mejores.length && (
        <div className="px-4 py-3">
          <p className="text-[13px] text-ink-muted mb-1">Donde menos</p>
          <div className="flex flex-col gap-1">
            {r.peores.map((e) => (
              <div key={e.name} className="flex items-center justify-between gap-3 text-[15px]">
                <span className="text-ink truncate">{e.name}</span>
                <span className={`shrink-0 ${tono(e.estado)}`}>{e.estado === "igual" ? "igual" : pctTxt(e.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <details className="group">
        <summary className="flex items-center justify-between gap-3 min-h-[46px] px-4 py-2 cursor-pointer list-none text-[17px] text-ink [&::-webkit-details-marker]:hidden">
          <span>Todos los ejercicios</span>
          <span className="flex items-center gap-2 text-ink-subtle">{progreso.length}<svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90 text-line-strong" aria-hidden="true"><path d="M1 1l6 6-6 6" /></svg></span>
        </summary>
        <div className="border-t border-line divide-y divide-line">
          {progreso.map((e) => (
            <div key={e.name} className="flex items-center justify-between gap-3 px-4 py-2 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-[15px] text-ink truncate">{e.name}</p>
                <p className="text-[13px] text-ink-muted">
                  {textoSerie(e)}{e.prevWeight != null || e.prevReps != null ? ` · antes ${textoSerie({ weight: e.prevWeight, reps: e.prevReps })}` : ""}
                </p>
              </div>
              <span className={`text-[15px] shrink-0 ${tono(e.estado)}`}>
                {e.estado === "nuevo" ? "nuevo" : e.estado === "sin-datos" ? "—" : e.estado === "igual" ? "igual" : pctTxt(e.pct)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
