import {
  fechaCorta, SEMANAS_ENTRENAMIENTO, type Renovacion, type Urgencia,
} from "@/lib/renovaciones";

const TONO: Record<Urgencia, { pastilla: string; caja: string }> = {
  "sin-plan": { pastilla: "bg-danger text-white", caja: "border-danger/40 bg-danger/5" },
  vencida: { pastilla: "bg-danger text-white", caja: "border-danger/40 bg-danger/5" },
  hoy: { pastilla: "bg-warn text-black", caja: "border-warn/40 bg-warn/5" },
  pronto: { pastilla: "bg-warn/20 text-warn border border-warn/40", caja: "border-line bg-page" },
  ok: { pastilla: "border border-line text-ink-muted", caja: "border-line bg-page" },
};

function Bloque({ icono, titulo, cada, r }: { icono: string; titulo: string; cada: string; r: Renovacion }) {
  const t = TONO[r.urgencia];
  return (
    <div className={`rounded-xl border px-4 py-3 ${t.caja}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <span className="text-sm font-bold text-ink">{icono} {titulo}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.pastilla}`}>{r.texto}</span>
      </div>
      <p className="text-xs text-ink-muted">
        {r.ultima
          ? <>Último: <span className="text-ink">{fechaCorta(r.ultima)}</span> · siguiente: <span className="text-ink">{r.toca ? fechaCorta(r.toca) : "—"}</span></>
          : <>Todavía no le has subido ninguno.</>}
      </p>
      <p className="text-[10px] text-ink-subtle mt-0.5">{cada}</p>
      {r.nota && <p className="text-[11px] text-brand mt-1.5">{r.nota}</p>}
    </div>
  );
}

/**
 * Cuándo toca cambiarle la planificación a esta clienta.
 *
 * No hay nada que marcar a mano: las dos fechas salen del último plan subido de
 * cada tipo, así que subir uno nuevo vuelve a poner el contador a cero solo.
 */
export default function Renovaciones({
  alimentacion, entrenamiento,
}: {
  alimentacion: Renovacion;
  entrenamiento: Renovacion;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Bloque icono="🥗" titulo="Alimentación" cada="Se cambia el día 1 de cada mes." r={alimentacion} />
      <Bloque icono="🏋️" titulo="Entrenamiento" cada={`Se cambia cada ${SEMANAS_ENTRENAMIENTO} semanas.`} r={entrenamiento} />
    </div>
  );
}
