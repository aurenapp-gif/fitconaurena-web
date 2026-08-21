"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  litros, vasos, pauta, MIN_AGUA, MAX_AGUA, MAX_NAME, MAX_DOSE, MAX_TIMING, MAX_NOTE,
  type Supplement,
} from "@/lib/suplementos";

/**
 * Pauta de agua y suplementación de una clienta, para la coach.
 *
 * Van juntos porque se rellenan de una vez, al montarle el plan: cuánta agua
 * bebe al día y qué se toma, con la dosis, el momento y dónde comprarlo.
 */
export default function SupplementPlan({
  member, agua, items,
}: { member: string; agua: number | null; items: Supplement[] }) {
  const router = useRouter();
  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  // --- Agua ----------------------------------------------------------------
  const [litrosTxt, setLitrosTxt] = useState(agua != null ? String(agua).replace(".", ",") : "");
  const [aguaEstado, setAguaEstado] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [aguaMsg, setAguaMsg] = useState("");

  async function guardarAgua() {
    if (aguaEstado === "loading") return;
    setAguaEstado("loading"); setAguaMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/suplementos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, agua: litrosTxt }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setAguaEstado("error"); setAguaMsg(d.error ?? "No se pudo guardar."); return; }
      setAguaEstado("saved"); router.refresh();
    } catch { setAguaEstado("error"); setAguaMsg("Error de conexión."); }
  }

  // --- Suplemento nuevo ----------------------------------------------------
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timing, setTiming] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [estado, setEstado] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function anadir(e: React.FormEvent) {
    e.preventDefault();
    if (estado === "loading") return;
    if (!name.trim()) { setEstado("error"); setMsg("Pon el nombre del suplemento."); return; }
    setEstado("loading"); setMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/suplementos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, name, dose, timing, url, note }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo guardar."); return; }
      setName(""); setDose(""); setTiming(""); setUrl(""); setNote("");
      setEstado("idle"); setMsg("Añadido ✓");
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  async function borrar(id: string, nombre: string) {
    if (!confirm(`¿Quitar «${nombre}» de su pauta? Dejará de verlo.`)) return;
    try {
      const res = await fetch("/api/miembros/clientas/suplementos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "No se pudo borrar."); return; }
      router.refresh();
    } catch { alert("Error de conexión."); }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Agua */}
      <div>
        <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">💧 Agua al día</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-[#A0A0A0] mb-1">Litros (entre {MIN_AGUA} y {MAX_AGUA})</label>
            <input
              value={litrosTxt}
              onChange={(e) => setLitrosTxt(e.target.value)}
              inputMode="decimal"
              placeholder="Ej. 2,5"
              aria-label="Litros de agua al día"
              className={`${cls} w-32`}
            />
          </div>
          <button type="button" onClick={guardarAgua} disabled={aguaEstado === "loading"} className="btn-brand text-sm px-5 py-3 disabled:opacity-60">
            {aguaEstado === "loading" ? "…" : "Guardar"}
          </button>
          {aguaEstado === "saved" && <span className="text-sm text-[#1CA0E3] pb-3">✓</span>}
        </div>
        {aguaMsg && <p className="text-sm text-[#FF6B6B] mt-1">{aguaMsg}</p>}
        <p className="text-xs text-[#666666] mt-1.5">
          {agua != null
            ? `Ahora tiene ${litros(agua)} al día (unos ${vasos(agua)} vasos). Ella registra el agua en vasos, así que se le enseñan las dos cosas.`
            : "Sin objetivo puesto. Déjalo en blanco y guarda para quitárselo."}
        </p>
      </div>

      {/* Suplementos */}
      <div>
        <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">💊 Suplementación</p>
        <form onSubmit={anadir} className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME}
              placeholder="Suplemento (ej. Creatina)" aria-label="Suplemento" className={`${cls} flex-1 min-w-[160px]`} />
            <input value={dose} onChange={(e) => setDose(e.target.value)} maxLength={MAX_DOSE}
              placeholder="Dosis (ej. 5 g)" aria-label="Dosis" className={`${cls} w-40`} />
          </div>
          <input value={timing} onChange={(e) => setTiming(e.target.value)} maxLength={MAX_TIMING}
            placeholder="Cuándo (ej. con el desayuno, antes de entrenar)" aria-label="Cuándo tomarlo" className={cls} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url"
            placeholder="Enlace para comprarlo (https://…) — opcional" aria-label="Enlace de compra" className={cls} />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={MAX_NOTE}
            placeholder="Nota (opcional): marca concreta, con comida, ciclar…" aria-label="Nota" className={cls} />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={estado === "loading"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
              {estado === "loading" ? "Guardando…" : "Añadir suplemento"}
            </button>
            {msg && <span className={`text-sm ${estado === "error" ? "text-[#FF6B6B]" : "text-[#1CA0E3]"}`}>{msg}</span>}
          </div>
        </form>

        {items.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-xs text-[#A0A0A0]">Su pauta ({items.length}):</p>
            {items.map((s) => (
              <div key={s.id} className="rounded-lg border border-[#252525] px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm text-white truncate">💊 {s.name}</span>
                    {pauta(s) && <span className="block text-xs text-[#A0A0A0]">{pauta(s)}</span>}
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm">Enlace</a>}
                    <button type="button" onClick={() => borrar(s.id, s.name)}
                      className="text-xs font-semibold text-[#FF6B6B] hover:underline shrink-0">✕ Quitar</button>
                  </span>
                </div>
                {s.note && <p className="text-xs text-[#A0A0A0] mt-1.5 whitespace-pre-wrap border-t border-[#252525] pt-1.5">💬 {s.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
