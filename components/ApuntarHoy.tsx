"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LITROS_POR_VASO, litrosDeVasos, textoLitros } from "@/lib/habitos";

export type DiaDeHoy = {
  water: number | null;
  steps: number | null;
  sleep: number | null;
  cycle_day: number | null;
  energy: number | null;
  trained: boolean | null;
};

/**
 * Apuntar el día desde la portada, sin entrar en ningún sitio.
 *
 * Es la pieza que da de comer a todo lo demás. El analizador, las fases, la
 * estrategia del mes: todo se calcula con lo que ella apunta, y con el
 * formulario de Hábitos —cuatro toques desde la portada y seis campos— lo
 * normal era no apuntar nada. En los datos de octubre, la mitad de las
 * clientas no llegaba a diez días al mes.
 *
 * Aquí solo hay DOS cosas, las dos de un toque: si ha entrenado y los vasos
 * de agua. Lo demás sigue en Hábitos para quien quiera el detalle. Lo que
 * predice el resultado es registrar algo todos los días, no registrarlo todo.
 *
 * Guarda el día ENTERO en cada toque, con los valores que ya tenía: la API
 * reescribe la fila completa, así que mandar solo el agua borraría el sueño.
 */
export default function ApuntarHoy({
  hoy, aguaObjetivo, racha,
}: { hoy: DiaDeHoy; aguaObjetivo: number | null; racha: number }) {
  const router = useRouter();
  const [dia, setDia] = useState<DiaDeHoy>(hoy);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState(false);

  async function guardar(cambio: Partial<DiaDeHoy>) {
    const nuevo = { ...dia, ...cambio };
    setDia(nuevo);            // la pantalla responde al momento
    setGuardando(true); setFallo(false);
    try {
      const res = await fetch("/api/miembros/habitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      if (!res.ok) { setFallo(true); setDia(dia); return; }
      router.refresh();
    } catch { setFallo(true); setDia(dia); }
    finally { setGuardando(false); }
  }

  const litros = litrosDeVasos(dia.water ?? 0);
  const aguaOk = aguaObjetivo != null && litros >= aguaObjetivo;

  const boton = (activo: boolean) =>
    `flex-1 min-h-[44px] rounded-[10px] text-[15px] font-semibold transition-colors ${
      activo ? "bg-ink text-page" : "bg-surface text-ink-muted"
    }`;

  return (
    <div className="rounded-[14px] bg-page p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[15px] font-semibold text-ink">¿Has entrenado hoy?</p>
        {racha >= 2 && <p className="text-[13px] text-brand font-semibold">{racha} días seguidos</p>}
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="¿Has entrenado hoy?">
        <button type="button" role="radio" aria-checked={dia.trained === true} disabled={guardando}
          onClick={() => guardar({ trained: dia.trained === true ? null : true })}
          className={boton(dia.trained === true)}>
          Sí
        </button>
        <button type="button" role="radio" aria-checked={dia.trained === false} disabled={guardando}
          onClick={() => guardar({ trained: dia.trained === false ? null : false })}
          className={boton(dia.trained === false)}>
          Hoy no
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="text-[15px] text-ink">
          Agua
          <span className="text-ink-subtle"> · {textoLitros(litros)}{aguaObjetivo ? ` de ${textoLitros(aguaObjetivo)}` : ""}</span>
        </span>
        <div className="flex items-center rounded-[10px] bg-surface overflow-hidden shrink-0">
          <button type="button" aria-label="Un vaso menos" disabled={guardando}
            onClick={() => guardar({ water: Math.max(0, (dia.water ?? 0) - 1) })}
            className="w-12 h-11 text-xl text-ink">−</button>
          <span className="w-px h-5 bg-line" aria-hidden="true" />
          <button type="button" aria-label="Un vaso más" disabled={guardando}
            onClick={() => guardar({ water: Math.min(40, (dia.water ?? 0) + 1) })}
            className={`w-12 h-11 text-xl ${aguaOk ? "text-success" : "text-ink"}`}>+</button>
        </div>
      </div>

      {fallo && <p role="alert" className="text-[13px] text-warn mt-2">No se pudo guardar. Inténtalo otra vez.</p>}
    </div>
  );
}
