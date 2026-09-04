"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { litros, miles, vasos, pasos as fmtPasos } from "@/lib/suplementos";

type Today = { water: number | null; steps: number | null; sleep: number | null };
export type DiaSemana = { label: string; done: boolean; hoy: boolean; futuro: boolean };

/**
 * Registro de hábitos del día: agua, pasos y sueño.
 *
 * Una tarjeta por hábito, grande y con el pulgar en mente: los botones de agua
 * miden 44 px, el número se lee de un vistazo y el objetivo que le ha puesto
 * su coach va al lado, sin tener que hacer cuentas. Arriba, la semana en
 * curso: qué días ha registrado y cuántos lleva seguidos.
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
  const [water, setWater] = useState<number>(initial.water ?? 0);
  const [steps, setSteps] = useState<string>(initial.steps != null ? String(initial.steps) : "");
  const [sleep, setSleep] = useState<string>(initial.sleep != null ? String(initial.sleep) : "");
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
          sleep: sleep === "" ? null : Number(sleep),
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

  const vasosObjetivo = aguaObjetivo != null ? vasos(aguaObjetivo) : null;
  const pasosNum = Number(steps);
  const pasosPct = pasosObjetivo && steps !== "" && Number.isFinite(pasosNum)
    ? Math.min(100, Math.round((pasosNum / pasosObjetivo) * 100))
    : 0;
  const campo = "w-full min-h-[48px] rounded-[11px] border border-line bg-surface px-3.5 text-[15px] font-bold text-ink placeholder:font-semibold placeholder:text-ink-subtle outline-none focus:border-brand";
  const tarjeta = "card-dark !p-4 !transform-none flex flex-col gap-2.5";
  const titulo = "text-sm font-extrabold text-ink";

  return (
    <div className="flex flex-col gap-3.5">
      {/* La semana */}
      <div className={tarjeta}>
        <div className="flex items-center justify-between">
          <h3 className={titulo}>Esta semana</h3>
          {streak >= 2 && <span className="text-xs font-bold text-brand">{streak} días seguidos</span>}
        </div>
        <div className="flex justify-between" aria-label="Días con hábitos registrados">
          {semana.map((d, i) => (
            <span
              key={i}
              aria-label={`${d.label}${d.done ? ": registrado" : d.hoy ? ": hoy" : ""}`}
              className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                d.done ? "bg-brand text-white"
                : d.hoy ? "border-2 border-brand text-brand"
                : d.futuro ? "bg-surface-2 text-ink-subtle/60"
                : "bg-surface-2 text-ink-subtle"
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* Agua */}
      <div className={tarjeta}>
        <div className="flex items-center justify-between">
          <h3 className={titulo}>Agua</h3>
          {vasosObjetivo != null && (
            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${water >= vasosObjetivo ? "bg-brand text-white" : "border border-line text-ink-muted"}`}>
              {water >= vasosObjetivo ? "Objetivo cumplido" : `de ${vasosObjetivo} vasos`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3.5">
          <button type="button" onClick={() => setWater((w) => Math.max(0, w - 1))} aria-label="Un vaso menos"
            className="w-11 h-11 rounded-xl border border-line bg-surface text-xl font-bold text-ink active:scale-95 transition-transform">−</button>
          <span className="flex-1 text-center text-3xl font-extrabold text-ink tracking-tight tabular-nums" aria-live="polite">{water}</span>
          <button type="button" onClick={() => setWater((w) => Math.min(40, w + 1))} aria-label="Un vaso más"
            className="w-11 h-11 rounded-xl border border-line bg-surface text-xl font-bold text-ink active:scale-95 transition-transform">+</button>
        </div>
        <p className="text-xs text-ink-muted">
          {aguaObjetivo != null
            ? <>Tu coach te ha puesto <strong className="text-ink">{litros(aguaObjetivo)} al día</strong>, que son unos {vasosObjetivo} vasos.</>
            : "Vasos de agua que llevas hoy."}
        </p>
      </div>

      {/* Pasos */}
      <div className={tarjeta}>
        <div className="flex items-center justify-between">
          <h3 className={titulo}>Pasos</h3>
          {pasosObjetivo != null && (
            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${pasosNum >= pasosObjetivo && steps !== "" ? "bg-brand text-white" : "border border-line text-ink-muted"}`}>
              {pasosNum >= pasosObjetivo && steps !== "" ? "Objetivo cumplido" : `de ${miles(pasosObjetivo)}`}
            </span>
          )}
        </div>
        <input type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)}
          placeholder={pasosObjetivo != null ? `Ej. ${pasosObjetivo}` : "Ej. 8000"} aria-label="Pasos de hoy" className={campo} />
        {pasosObjetivo != null && (
          <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pasosPct} aria-valuemin={0} aria-valuemax={100} aria-label="Pasos sobre el objetivo">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pasosPct}%` }} />
          </div>
        )}
        <p className="text-xs text-ink-muted">
          {pasosObjetivo != null
            ? <>Tu coach te ha puesto <strong className="text-ink">{fmtPasos(pasosObjetivo)} al día</strong>.</>
            : "Los que marque tu móvil o tu reloj."}
        </p>
      </div>

      {/* Sueño */}
      <div className={tarjeta}>
        <h3 className={titulo}>Sueño (horas)</h3>
        <input type="number" inputMode="decimal" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Ej. 7,5" aria-label="Horas de sueño" className={campo} />
      </div>

      <button type="button" onClick={save} disabled={status === "saving"} className="btn-brand text-[15px] w-full !min-h-[50px] disabled:opacity-60">
        {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado ✓" : "Guardar hábitos"}
      </button>
      {status === "error" && <p role="alert" className="text-sm text-danger text-center -mt-1">{errMsg || "No se pudo guardar."}</p>}
    </div>
  );
}
