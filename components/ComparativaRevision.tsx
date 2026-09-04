import { balance, textoDelta, tituloBalance, type Cambio } from "@/lib/progreso";

const TONO = {
  baja: { texto: "text-brand", borde: "border-brand/40", fondo: "bg-brand/10" },
  sube: { texto: "text-danger", borde: "border-danger/40", fondo: "bg-danger/10" },
  igual: { texto: "text-ink-muted", borde: "border-line", fondo: "bg-page" },
} as const;

/**
 * Las medidas de una revisión con su diferencia respecto a la anterior.
 *
 * Una sola regla, igual para todas las medidas y todas las clientas: lo que
 * baja se pinta en azul y lo que sube en rojo. Sin excepciones que haya que
 * recordar al mirarlo.
 */
export default function ComparativaRevision({
  cambios,
  etiquetaReferencia,
}: {
  cambios: Cambio[];
  /** Contra qué se compara: «la anterior», «la primera»… */
  etiquetaReferencia: string;
}) {
  if (cambios.length === 0) return null;
  const hayComparacion = cambios.some((c) => c.delta !== null);
  const b = balance(cambios);
  const titulo = tituloBalance(b);

  return (
    <div className="mb-3">
      {hayComparacion && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              titulo.tono === "bien"
                ? "border-brand/40 bg-brand/10 text-brand"
                : titulo.tono === "mal"
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-line text-ink-muted"
            }`}
          >
            {titulo.texto}
          </span>
          <span className="text-[10px] text-ink-subtle">frente a {etiquetaReferencia}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {cambios.map((c) => {
          const t = TONO[c.veredicto];
          const flecha = c.delta === null || c.delta === 0 ? "" : c.delta > 0 ? "↑" : "↓";
          return (
            <span
              key={c.key}
              className={`text-xs rounded-lg border px-2.5 py-1 ${t.borde} ${t.fondo}`}
            >
              <span className="text-ink-subtle">{c.label}: </span>
              <span className="text-ink font-semibold">
                {c.valor.toLocaleString("es-ES", { maximumFractionDigits: 1 })} {c.unidad}
              </span>
              {c.delta !== null && (
                <span className={`ml-1.5 font-bold ${t.texto}`}>
                  {flecha} {textoDelta(c.delta, c.unidad)}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
