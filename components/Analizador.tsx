import type { Hallazgo, Prioridad } from "@/lib/analisis";

const PINTA: Record<Prioridad, { fondo: string; texto: string; etiqueta: string }> = {
  alta: { fondo: "bg-warn-soft border-warn/40", texto: "text-warn", etiqueta: "Mira esto primero" },
  media: { fondo: "bg-surface border-line", texto: "text-ink", etiqueta: "Ajuste" },
  baja: { fondo: "bg-surface border-line", texto: "text-ink-muted", etiqueta: "Menor" },
  info: { fondo: "bg-page border-line", texto: "text-ink-muted", etiqueta: "Para saber" },
};

/**
 * Lo que ha encontrado el analizador, de lo más urgente a lo menos.
 *
 * Cada hallazgo enseña el dato que lo provoca y el estudio del que sale el
 * umbral. Es a propósito: así la coach puede llevarle la contraria a la app
 * mirando el mismo número, en vez de creérsela.
 */
export default function Analizador({ hallazgos }: { hallazgos: Hallazgo[] }) {
  if (hallazgos.length === 0) {
    return <p className="text-sm text-ink-muted">Nada que señalar con los datos que hay.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {hallazgos.map((x) => {
        const p = PINTA[x.prioridad];
        return (
          <div key={x.id} className={`rounded-xl border p-4 ${p.fondo}`}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-wide ${p.texto}`}>{p.etiqueta}</span>
            </div>
            <p className={`text-[17px] font-semibold leading-snug ${x.prioridad === "alta" ? "text-warn" : "text-ink"}`}>
              {x.titulo}
            </p>
            <p className="text-[14px] text-ink-muted mt-1">{x.dato}</p>
            <p className="text-[15px] text-ink mt-2">{x.quehacer}</p>
            {x.fuente && (
              <p className="text-[12px] text-ink-subtle mt-2">
                De dónde sale:{" "}
                <a href={x.fuente.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {x.fuente.cita}
                </a>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
