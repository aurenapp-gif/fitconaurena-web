"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { litros, vasos, pasos as fmtPasos } from "@/lib/suplementos";

type Today = { water: number | null; steps: number | null; sleep: number | null };

export default function HabitsTracker({
  initial,
  streak,
  last7,
  aguaObjetivo,
  pasosObjetivo,
}: {
  initial: Today;
  streak: number;
  last7: { label: string; done: boolean }[];
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

  const inputCls =
    "w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-5">
      <div className="card-dark p-6 !transform-none">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-bold text-ink">Hábitos de hoy</h3>
          {streak >= 2 && (
            <span className="text-xs font-bold text-brand bg-brand/10 border border-brand/30 rounded-full px-3 py-1">
              🔥 {streak} días seguidos
            </span>
          )}
        </div>
        <p className="text-sm text-ink-muted mb-5">Registra tu día. Guarda cuando termines.</p>

        {/* Agua */}
        <div className="mb-5">
          <label className="block text-xs text-ink-muted mb-2">💧 Agua (vasos)</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setWater((w) => Math.max(0, w - 1))} className="btn-outline w-10 h-10 !px-0 !py-0 text-lg">−</button>
            <span className="text-2xl font-extrabold text-ink w-10 text-center">{water}</span>
            <button type="button" onClick={() => setWater((w) => Math.min(40, w + 1))} className="btn-outline w-10 h-10 !px-0 !py-0 text-lg">+</button>
            {/* El objetivo lo pone la coach en litros, pero aquí se cuenta en
                vasos: se enseñan los dos para que no haya que hacer cuentas. */}
            {aguaObjetivo != null && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${water >= vasos(aguaObjetivo) ? "bg-brand text-white" : "border border-line text-ink-muted"}`}>
                {water >= vasos(aguaObjetivo) ? "Objetivo cumplido ✓" : `de ${vasos(aguaObjetivo)}`}
              </span>
            )}
          </div>
          {aguaObjetivo != null && (
            <p className="text-xs text-ink-subtle mt-2">
              Tu coach te ha puesto <strong className="text-ink">{litros(aguaObjetivo)} al día</strong>, que son unos {vasos(aguaObjetivo)} vasos.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-xs text-ink-muted">👟 Pasos</label>
              {pasosObjetivo != null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  Number(steps) >= pasosObjetivo ? "bg-brand text-white" : "border border-line text-ink-muted"
                }`}>
                  {Number(steps) >= pasosObjetivo ? "Objetivo cumplido ✓" : `de ${pasosObjetivo.toLocaleString("es-ES")}`}
                </span>
              )}
            </div>
            <input type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)}
              placeholder={pasosObjetivo != null ? `Ej. ${pasosObjetivo}` : "Ej. 8000"} className={inputCls} />
            {pasosObjetivo != null && (
              <p className="text-xs text-ink-subtle mt-1.5">
                Tu coach te ha puesto <strong className="text-ink">{fmtPasos(pasosObjetivo)} al día</strong>.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">😴 Sueño (horas)</label>
            <input type="number" inputMode="decimal" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Ej. 7.5" className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={status === "saving"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
            {status === "saving" ? "Guardando…" : "Guardar hábitos"}
          </button>
          {status === "saved" && <span className="text-sm text-brand">Guardado ✓</span>}
          {status === "error" && <span className="text-sm text-danger">{errMsg || "No se pudo guardar."}</span>}
        </div>
      </div>

      {/* Últimos 7 días */}
      <div className="card-dark p-6 !transform-none">
        <h3 className="font-bold text-ink mb-4">Últimos 7 días</h3>
        <div className="flex justify-between gap-2">
          {last7.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${d.done ? "bg-brand text-white font-bold" : "bg-page border border-line text-ink-subtle"}`}>
                {d.done ? "✓" : ""}
              </div>
              <span className="text-[10px] text-ink-subtle">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
