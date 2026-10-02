import { textoFase, type Fase, type Progreso } from "@/lib/estrategia";

/**
 * Por dónde va ella en su recorrido.
 *
 * Es un mapa, no una lista de deberes: se ven todas las fases para que sepa de
 * dónde viene y qué queda, con la de ahora marcada. Las que ya pasó quedan en
 * gris —están hechas— y las que vienen, en gris claro.
 */
export default function FaseDeLaClienta({ fases, progreso }: { fases: Fase[]; progreso: Progreso }) {
  const orden = [...fases].sort((a, b) => a.posicion - b.posicion);

  return (
    <div className="bg-surface rounded-[14px] p-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-[13px] font-semibold text-brand uppercase tracking-wide">{textoFase(progreso)}</span>
        <span className="text-[13px] text-ink-muted">{progreso.pct}% del recorrido</span>
      </div>
      <p className="text-[19px] font-semibold text-ink leading-snug">{progreso.titulo}</p>
      {progreso.detalle && <p className="text-[15px] text-ink-muted mt-1">{progreso.detalle}</p>}

      <div className="flex gap-1 mt-3" aria-hidden="true">
        {orden.map((f) => (
          <span key={f.posicion}
            className={`h-[6px] flex-1 rounded-full ${f.posicion < progreso.actual ? "bg-brand/40" : f.posicion === progreso.actual ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      <ol className="mt-4 flex flex-col gap-2.5">
        {orden.map((f) => {
          const pasada = f.posicion < progreso.actual;
          const esta = f.posicion === progreso.actual;
          return (
            <li key={f.posicion} className="flex items-start gap-3">
              <span className={`shrink-0 mt-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] font-bold ${
                esta ? "bg-brand text-white" : pasada ? "bg-brand/15 text-brand" : "border-[1.5px] border-line-strong text-ink-subtle"}`}>
                {pasada ? "✓" : f.posicion}
              </span>
              <span className={`text-[15px] leading-snug ${esta ? "text-ink font-semibold" : pasada ? "text-ink-subtle" : "text-ink-muted"}`}>
                {f.titulo}
              </span>
            </li>
          );
        })}
      </ol>

      {progreso.siguiente && (
        <p className="text-[13px] text-ink-subtle mt-3">Después viene: {progreso.siguiente}</p>
      )}
    </div>
  );
}
