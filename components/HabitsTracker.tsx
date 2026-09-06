"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { litros, pasos as fmtPasos, miles } from "@/lib/suplementos";
import { ENERGIA, litrosDeVasos, textoLitros, type DiaSemana } from "@/lib/habitos";
import { Barra, Grupo } from "@/components/Grupo";

type Today = { water: number | null; steps: number | null; sleep: number | null; cycle_day?: number | null; energy?: number | null };

/**
 * Apuntar el día: agua, pasos, sueño, y si ella quiere, ciclo y energía.
 *
 * Grupos al estilo de iOS, con el pulgar en mente: el agua se cuenta con un
 * control de más/menos en pasos de 0,25 L (un vaso), el número se lee de un
 * vistazo y el objetivo que le ha puesto su coach va al lado. Arriba, la
 * semana en curso: qué días ha apuntado y cuántos lleva seguidos.
 */
export default function HabitsTracker({
  initial,
  streak,
  semana,
  aguaObjetivo,
  pasosObjetivo,
}: {
  initial: Today;
  streak: number;
  semana: DiaSemana[];
  /** Litros al día que le ha puesto su coach, si le ha puesto alguno. */
  aguaObjetivo?: number | null;
  /** Pasos al día que le ha puesto su coach, si le ha puesto alguno. */
  pasosObjetivo?: number | null;
}) {
  const router = useRouter();
  const [water, setWater] = useState<number>(initial.water ?? 0); // en vasos
  const [steps, setSteps] = useState<string>(initial.steps != null ? String(initial.steps) : "");
  const [sleep, setSleep] = useState<string>(initial.sleep != null ? String(initial.sleep) : "");
  const [ciclo, setCiclo] = useState<string>(initial.cycle_day != null ? String(initial.cycle_day) : "");
  const [energia, setEnergia] = useState<number | null>(initial.energy ?? null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function save() {
    if (status === "saving") return;
    setStatus("saving");
    setErrMsg("");
    try {
      const res = await fetch("/api/miembros/habitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          water,
          steps: steps === "" ? null : Number(steps),
          sleep: sleep === "" ? null : Number(sleep.replace(",", ".")),
          cycle_day: ciclo === "" ? null : Number(ciclo),
          energy: energia,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrMsg(d.error ?? "No se pudo guardar.");
        setStatus("error");
        return;
      }
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setErrMsg("Error de conexión.");
      setStatus("error");
    }
  }

  const litrosHoy = litrosDeVasos(water);
  const aguaOk = aguaObjetivo != null && litrosHoy >= aguaObjetivo;
  const pasosNum = Number(steps);
  const pasosOk = pasosObjetivo != null && steps !== "" && pasosNum >= pasosObjetivo;
  const pasosPct = pasosObjetivo && steps !== "" && Number.isFinite(pasosNum) ? (pasosNum / pasosObjetivo) * 100 : 0;
  const hechosSemana = semana.filter((d) => d.done).length;

  const campo = "w-24 text-right bg-transparent text-[17px] text-ink placeholder:text-ink-subtle outline-none";
  const fila = "flex items-center justify-between gap-3 min-h-[46px] px-4 py-2 text-[17px] text-ink";
  const pastilla = (ok: boolean, txt: string) => (
    <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${ok ? "bg-success-soft text-success" : "bg-surface-2 text-ink-muted"}`}>{ok ? "Conseguido" : txt}</span>
  );

  return (
    <div className="flex flex-col gap-5">
      <Grupo label="Esta semana" foot={
        streak >= 2
          ? `${streak} días seguidos. ${semana.some((d) => d.hoy && !d.done) ? "Hoy, con apuntarlo, ya son " + (streak + 1) + "." : "Sigue así."}`
          : hechosSemana > 0 ? `${hechosSemana} de 7 esta semana.` : "Apunta tu día en un minuto: agua, pasos y sueño."
      }>
        <div className="flex justify-between px-4 py-3" aria-label="Días con hábitos apuntados">
          {semana.map((d) => (
            <span
              key={d.fecha}
              aria-label={`${d.label}${d.done ? ": apuntado" : d.hoy ? ": hoy" : ""}`}
              className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-semibold ${
                d.done ? "bg-brand text-white" : d.hoy ? "border-[1.5px] border-brand text-brand" : "bg-surface-2 text-ink-subtle"
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </Grupo>

      <Grupo label="Agua" foot={aguaObjetivo != null ? `Tu coach te ha puesto ${litros(aguaObjetivo)} al día. Cada paso es un vaso (0,25 L).` : "Cada paso es un vaso (0,25 L)."}>
        <div className={fila}>
          <span>Litros</span>
          <div className="flex items-center gap-3.5">
            {aguaObjetivo != null && pastilla(aguaOk, `de ${litros(aguaObjetivo)}`)}
            <span className="text-[17px] font-semibold tabular-nums" aria-live="polite">{textoLitros(litrosHoy)}</span>
            <div className="flex items-center rounded-lg bg-surface-2 overflow-hidden">
              <button type="button" onClick={() => setWater((w) => Math.max(0, w - 1))} aria-label="Un vaso menos" className="w-11 h-8 text-xl text-ink flex items-center justify-center active:bg-line">−</button>
              <span className="w-px h-[18px] bg-line-strong" aria-hidden="true" />
              <button type="button" onClick={() => setWater((w) => Math.min(40, w + 1))} aria-label="Un vaso más" className="w-11 h-8 text-xl text-ink flex items-center justify-center active:bg-line">+</button>
            </div>
          </div>
        </div>
      </Grupo>

      <Grupo label="Pasos" foot={pasosObjetivo != null ? `Objetivo: ${fmtPasos(pasosObjetivo)} al día.` : "Los que marque tu móvil o tu reloj."}>
        <label className={fila}>
          <span>Hoy</span>
          <div className="flex items-center gap-3">
            {pasosObjetivo != null && pastilla(pasosOk, `de ${miles(pasosObjetivo)}`)}
            <input type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={pasosObjetivo != null ? miles(pasosObjetivo) : "8000"} aria-label="Pasos de hoy" className={campo} />
          </div>
        </label>
        {pasosObjetivo != null && <div className="px-4 pb-3 -mt-1"><Barra pct={pasosPct} /></div>}
      </Grupo>

      <Grupo label="Descanso y ciclo" foot="El ciclo es opcional. Apuntarlo ayuda a entender el peso y la energía de cada semana, y solo lo veis tú y tu coach.">
        <label className={fila}>
          <span>Horas de sueño</span>
          <input type="number" inputMode="decimal" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7,5" aria-label="Horas de sueño" className={campo} />
        </label>
        <label className={fila}>
          <span className="min-w-0"><span className="block">Día del ciclo</span><span className="block text-[13px] text-ink-muted">Opcional</span></span>
          <input type="number" inputMode="numeric" min={1} max={45} value={ciclo} onChange={(e) => setCiclo(e.target.value)} placeholder="—" aria-label="Día del ciclo" className={campo} />
        </label>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2"><span className="text-[17px] text-ink">Energía de hoy</span></div>
          <div className="flex gap-1 p-0.5 rounded-lg bg-surface-2" role="radiogroup" aria-label="Energía de hoy">
            {ENERGIA.map((t, i) => {
              const v = i + 1;
              const on = energia === v;
              return (
                <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setEnergia(on ? null : v)}
                  className={`flex-1 min-h-[34px] rounded-[7px] text-[12px] font-medium ${on ? "bg-surface text-ink shadow-sm font-semibold" : "text-ink-muted"}`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </Grupo>

      <button type="button" onClick={save} disabled={status === "saving"} className="btn-brand text-[17px] w-full !min-h-[50px] disabled:opacity-60">
        {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : "Guardar mi día"}
      </button>
      {status === "error" && <p role="alert" className="text-sm text-danger text-center -mt-2">{errMsg || "No se pudo guardar."}</p>}
    </div>
  );
}
