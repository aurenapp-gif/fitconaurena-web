import { balance, textoDelta, tituloBalance, type Cambio } from "@/lib/progreso";

const TONO = {
  mejora: { texto: "text-[#1CA0E3]", borde: "border-[#1CA0E3]/40", fondo: "bg-[#1CA0E3]/10" },
  empeora: { texto: "text-[#FF6B6B]", borde: "border-[#FF6B6B]/40", fondo: "bg-[#FF6B6B]/10" },
  igual: { texto: "text-[#A0A0A0]", borde: "border-[#252525]", fondo: "bg-[#141414]" },
  "sin-direccion": { texto: "text-[#A0A0A0]", borde: "border-[#252525]", fondo: "bg-[#141414]" },
} as const;

/**
 * Las medidas de una revisión con su diferencia respecto a la anterior.
 *
 * Cada medida lleva su número y, si hay con qué comparar, cuánto ha cambiado.
 * El color solo aparece cuando el objetivo de la clienta dice hacia dónde es
 * mejorar; cuando no lo dice, el número sale en gris con su flecha. Ver
 * `direccionDe` en lib/progreso.ts.
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
                ? "border-[#1CA0E3]/40 bg-[#1CA0E3]/10 text-[#1CA0E3]"
                : titulo.tono === "mal"
                ? "border-[#FF6B6B]/40 bg-[#FF6B6B]/10 text-[#FF6B6B]"
                : "border-[#252525] text-[#A0A0A0]"
            }`}
          >
            {titulo.texto}
          </span>
          <span className="text-[10px] text-[#666666]">frente a {etiquetaReferencia}</span>
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
              <span className="text-[#666666]">{c.label}: </span>
              <span className="text-white font-semibold">
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
