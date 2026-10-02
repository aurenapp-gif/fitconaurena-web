"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Las calorías y la proteína de un plan de alimentación.
 *
 * Si la app las ha encontrado leyendo el plan, salen propuestas pero NO
 * guardadas: un número sacado de un PDF a base de expresiones regulares se
 * confirma antes de que el analizador calcule nada con él.
 */
export default function MacrosPlan({
  planId,
  kcal,
  proteina,
  detectado,
}: {
  planId: string;
  kcal: number | null;
  proteina: number | null;
  /** Lo que se ha encontrado en el texto del plan, si hay algo. */
  detectado?: { kcal: number | null; proteina: number | null };
}) {
  const router = useRouter();
  const [k, setK] = useState(kcal != null ? String(kcal) : "");
  const [p, setP] = useState(proteina != null ? String(proteina) : "");
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const guardado = kcal != null || proteina != null;
  const hayPropuesta =
    !guardado && !!detectado && (detectado.kcal != null || detectado.proteina != null) && !k && !p;

  async function guardar() {
    if (estado === "guardando") return;
    setEstado("guardando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/plan/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, kcal: k, proteina: p }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo guardar."); return; }
      setEstado("ok"); setMsg("Guardado");
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  const campo = "w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <label className="text-xs text-ink-subtle">
        kcal{" "}
        <input value={k} onChange={(e) => { setK(e.target.value.replace(/[^\d]/g, "")); setEstado("idle"); }}
          inputMode="numeric" placeholder="2100" className={campo} aria-label="Calorías del plan" />
      </label>
      <label className="text-xs text-ink-subtle">
        proteína (g){" "}
        <input value={p} onChange={(e) => { setP(e.target.value.replace(/[^\d]/g, "")); setEstado("idle"); }}
          inputMode="numeric" placeholder="130" className={campo} aria-label="Proteína del plan en gramos" />
      </label>
      <button type="button" onClick={guardar} disabled={estado === "guardando"}
        className="btn-outline text-xs px-3 py-1.5 disabled:opacity-50">
        {estado === "guardando" ? "…" : "Guardar"}
      </button>
      {msg && <span className={`text-xs ${estado === "error" ? "text-warn" : "text-brand"}`}>{msg}</span>}
      {hayPropuesta && (
        <button type="button"
          onClick={() => {
            setK(detectado!.kcal != null ? String(detectado!.kcal) : "");
            setP(detectado!.proteina != null ? String(detectado!.proteina) : "");
          }}
          className="text-xs text-brand underline">
          En el plan pone {detectado!.kcal ?? "—"} kcal y {detectado!.proteina ?? "—"} g · usarlo
        </button>
      )}
    </div>
  );
}
