"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Today = { water: number | null; steps: number | null; sleep: number | null };

export default function HabitsTracker({
  initial,
  streak,
  last7,
}: {
  initial: Today;
  streak: number;
  last7: { label: string; done: boolean }[];
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
    "w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <div className="flex flex-col gap-5">
      <div className="card-dark p-6 !transform-none">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-bold text-white">Hábitos de hoy</h3>
          {streak >= 2 && (
            <span className="text-xs font-bold text-[#1CA0E3] bg-[#1CA0E3]/10 border border-[#1CA0E3]/30 rounded-full px-3 py-1">
              🔥 {streak} días seguidos
            </span>
          )}
        </div>
        <p className="text-sm text-[#A0A0A0] mb-5">Registra tu día. Guarda cuando termines.</p>

        {/* Agua */}
        <div className="mb-5">
          <label className="block text-xs text-[#A0A0A0] mb-2">💧 Agua (vasos)</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setWater((w) => Math.max(0, w - 1))} className="btn-outline w-10 h-10 !px-0 !py-0 text-lg">−</button>
            <span className="text-2xl font-extrabold text-white w-10 text-center">{water}</span>
            <button type="button" onClick={() => setWater((w) => Math.min(40, w + 1))} className="btn-outline w-10 h-10 !px-0 !py-0 text-lg">+</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <div>
            <label className="block text-xs text-[#A0A0A0] mb-1">👟 Pasos</label>
            <input type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Ej. 8000" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-[#A0A0A0] mb-1">😴 Sueño (horas)</label>
            <input type="number" inputMode="decimal" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Ej. 7.5" className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={status === "saving"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
            {status === "saving" ? "Guardando…" : "Guardar hábitos"}
          </button>
          {status === "saved" && <span className="text-sm text-[#1CA0E3]">Guardado ✓</span>}
          {status === "error" && <span className="text-sm text-[#FF6B6B]">{errMsg || "No se pudo guardar."}</span>}
        </div>
      </div>

      {/* Últimos 7 días */}
      <div className="card-dark p-6 !transform-none">
        <h3 className="font-bold text-white mb-4">Últimos 7 días</h3>
        <div className="flex justify-between gap-2">
          {last7.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${d.done ? "bg-[#1CA0E3] text-white font-bold" : "bg-[#141414] border border-[#252525] text-[#666666]"}`}>
                {d.done ? "✓" : ""}
              </div>
              <span className="text-[10px] text-[#666666]">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
