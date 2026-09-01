import {
  fechaCorta, SEMANAS_ENTRENAMIENTO, type Renovacion, type Urgencia,
} from "@/lib/renovaciones";

const TONO: Record<Urgencia, { pastilla: string; caja: string }> = {
  "sin-plan": { pastilla: "bg-[#FF6B6B] text-white", caja: "border-[#FF6B6B]/40 bg-[#FF6B6B]/5" },
  vencida: { pastilla: "bg-[#FF6B6B] text-white", caja: "border-[#FF6B6B]/40 bg-[#FF6B6B]/5" },
  hoy: { pastilla: "bg-[#FFB800] text-black", caja: "border-[#FFB800]/40 bg-[#FFB800]/5" },
  pronto: { pastilla: "bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40", caja: "border-[#252525] bg-[#0A0A0A]" },
  ok: { pastilla: "border border-[#252525] text-[#A0A0A0]", caja: "border-[#252525] bg-[#0A0A0A]" },
};

function Bloque({ icono, titulo, cada, r }: { icono: string; titulo: string; cada: string; r: Renovacion }) {
  const t = TONO[r.urgencia];
  return (
    <div className={`rounded-xl border px-4 py-3 ${t.caja}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <span className="text-sm font-bold text-white">{icono} {titulo}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.pastilla}`}>{r.texto}</span>
      </div>
      <p className="text-xs text-[#A0A0A0]">
        {r.ultima
          ? <>Último: <span className="text-white">{fechaCorta(r.ultima)}</span> · siguiente: <span className="text-white">{r.toca ? fechaCorta(r.toca) : "—"}</span></>
          : <>Todavía no le has subido ninguno.</>}
      </p>
      <p className="text-[10px] text-[#666666] mt-0.5">{cada}</p>
      {r.nota && <p className="text-[11px] text-[#1CA0E3] mt-1.5">{r.nota}</p>}
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
