"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  litros, vasos, pauta, pasos, MIN_AGUA, MAX_AGUA, MIN_PASOS, MAX_PASOS,
  MAX_NAME, MAX_DOSE, MAX_TIMING, MAX_NOTE, PAUTA_HABITUAL, NOTA_DESCUENTO,
  type Supplement,
} from "@/lib/suplementos";

/**
 * Pauta diaria de una clienta, para la coach: agua, pasos y suplementación.
 *
 * Van juntos porque se rellenan de una vez, al montarle el plan: cuánta agua
 * bebe, cuánto anda y qué se toma, con la dosis, el momento y dónde comprarlo.
 */
export default function SupplementPlan({
  member, agua, pasosObjetivo, items,
}: { member: string; agua: number | null; pasosObjetivo: number | null; items: Supplement[] }) {
  const router = useRouter();
  const cls = "rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

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

  // --- Pasos ---------------------------------------------------------------
  const [pasosTxt, setPasosTxt] = useState(pasosObjetivo != null ? String(pasosObjetivo) : "");
  const [pasosEstado, setPasosEstado] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [pasosMsg, setPasosMsg] = useState("");

  async function guardarPasos() {
    if (pasosEstado === "loading") return;
    setPasosEstado("loading"); setPasosMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/suplementos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, pasos: pasosTxt }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setPasosEstado("error"); setPasosMsg(d.error ?? "No se pudo guardar."); return; }
      setPasosEstado("saved"); router.refresh();
    } catch { setPasosEstado("error"); setPasosMsg("Error de conexión."); }
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

  // --- Pauta habitual ------------------------------------------------------
  // Casillas ya marcadas con lo de siempre. Lo que ya tiene la clienta viene
  // desmarcado para no duplicarlo. Enlace y nota se pueden retocar antes.
  const yaTiene = new Set(items.map((s) => s.name.trim().toLowerCase()));
  const [marcados, setMarcados] = useState<boolean[]>(() => PAUTA_HABITUAL.map((p) => !yaTiene.has(p.name.toLowerCase())));
  const [dosis, setDosis] = useState<string[]>(() => PAUTA_HABITUAL.map((p) => p.dose));
  const [momentos, setMomentos] = useState<string[]>(() => PAUTA_HABITUAL.map((p) => p.timing));
  const [enlaces, setEnlaces] = useState<string[]>(() => PAUTA_HABITUAL.map((p) => p.url));
  const [notaHabitual, setNotaHabitual] = useState(NOTA_DESCUENTO);
  const [habEstado, setHabEstado] = useState<"idle" | "loading" | "error" | "saved">("idle");
  const [habMsg, setHabMsg] = useState("");

  async function anadirHabitual() {
    if (habEstado === "loading") return;
    const seleccion = PAUTA_HABITUAL.map((p, i) => ({ ...p, dose: dosis[i].trim(), timing: momentos[i].trim(), url: enlaces[i].trim(), note: notaHabitual, on: marcados[i] })).filter((p) => p.on);
    if (seleccion.length === 0) { setHabEstado("error"); setHabMsg("Marca al menos un suplemento."); return; }
    setHabEstado("loading"); setHabMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/suplementos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, items: seleccion.map(({ name, dose, timing, url, note }) => ({ name, dose, timing, url, note })) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setHabEstado("error"); setHabMsg(d.error ?? "No se pudo guardar."); return; }
      setHabEstado("saved"); setHabMsg(`Añadidos ${seleccion.length}.`);
      setMarcados(PAUTA_HABITUAL.map(() => false));
      router.refresh();
    } catch { setHabEstado("error"); setHabMsg("Error de conexión."); }
  }

  // --- Editar uno que ya tiene ---------------------------------------------
  // Subirle las cápsulas a la creatina no debería obligar a borrarla y volver
  // a escribirla entera.
  const [editando, setEditando] = useState<string | null>(null);
  const [ed, setEd] = useState({ name: "", dose: "", timing: "", url: "", note: "" });
  const [edEstado, setEdEstado] = useState<"idle" | "loading" | "error">("idle");
  const [edMsg, setEdMsg] = useState("");

  function abrirEdicion(s: Supplement) {
    setEditando(s.id);
    setEd({ name: s.name, dose: s.dose ?? "", timing: s.timing ?? "", url: s.url ?? "", note: s.note ?? "" });
    setEdEstado("idle"); setEdMsg("");
  }

  async function guardarEdicion() {
    if (edEstado === "loading" || !editando) return;
    if (!ed.name.trim()) { setEdEstado("error"); setEdMsg("Pon el nombre del suplemento."); return; }
    setEdEstado("loading"); setEdMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/suplementos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editando, ...ed }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEdEstado("error"); setEdMsg(d.error ?? "No se pudo guardar."); return; }
      setEditando(null); setEdEstado("idle");
      router.refresh();
    } catch { setEdEstado("error"); setEdMsg("Error de conexión."); }
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
        <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">💧 Agua al día</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Litros (entre {MIN_AGUA} y {MAX_AGUA})</label>
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
          {aguaEstado === "saved" && <span className="text-sm text-brand pb-3">✓</span>}
        </div>
        {aguaMsg && <p className="text-sm text-danger mt-1">{aguaMsg}</p>}
        <p className="text-xs text-ink-subtle mt-1.5">
          {agua != null
            ? `Ahora tiene ${litros(agua)} al día (unos ${vasos(agua)} vasos). Ella registra el agua en vasos, así que se le enseñan las dos cosas.`
            : "Sin objetivo puesto. Déjalo en blanco y guarda para quitárselo."}
        </p>
      </div>

      {/* Pasos */}
      <div>
        <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">👟 Pasos al día</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-ink-muted mb-1">
              Pasos (entre {MIN_PASOS.toLocaleString("es-ES")} y {MAX_PASOS.toLocaleString("es-ES")})
            </label>
            <input
              value={pasosTxt}
              onChange={(e) => setPasosTxt(e.target.value)}
              inputMode="numeric"
              placeholder="Ej. 8000"
              aria-label="Pasos al día"
              className={`${cls} w-32`}
            />
          </div>
          <button type="button" onClick={guardarPasos} disabled={pasosEstado === "loading"} className="btn-brand text-sm px-5 py-3 disabled:opacity-60">
            {pasosEstado === "loading" ? "…" : "Guardar"}
          </button>
          {pasosEstado === "saved" && <span className="text-sm text-brand pb-3">✓</span>}
        </div>
        {pasosMsg && <p className="text-sm text-danger mt-1">{pasosMsg}</p>}
        <p className="text-xs text-ink-subtle mt-1.5">
          {pasosObjetivo != null
            ? `Ahora tiene ${pasos(pasosObjetivo)} al día. Le sale al registrar sus hábitos, junto a los pasos que lleva.`
            : "Sin objetivo puesto. Déjalo en blanco y guarda para quitárselo."}
        </p>
      </div>

      {/* Suplementos */}
      <div>
        <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">💊 Suplementación</p>

        {/* Pauta habitual: lo de siempre, de una vez */}
        <div className="rounded-xl bg-page p-4 mb-4">
          <p className="text-sm font-semibold text-ink mb-0.5">Tu pauta habitual</p>
          <p className="text-xs text-ink-muted mb-3">Marca lo que le toca. Dosis, momento y enlace vienen puestos y se pueden cambiar (por ejemplo, más creatina según su peso). Lo que ya tiene viene desmarcado.</p>
          <div className="flex flex-col gap-2">
            {PAUTA_HABITUAL.map((p, i) => {
              const tiene = yaTiene.has(p.name.toLowerCase());
              return (
                <div key={p.name} className={`rounded-lg bg-surface px-3 py-2 ${marcados[i] ? "" : "opacity-70"}`}>
                  <label className="flex items-start gap-3 cursor-pointer min-h-[40px]">
                    <input type="checkbox" checked={marcados[i]} onChange={(e) => setMarcados((m) => m.map((v, j) => (j === i ? e.target.checked : v)))}
                      aria-label={`Añadir ${p.name}`} className="mt-1.5 w-5 h-5 accent-[#1CA0E3] shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{p.name}{tiene && <span className="text-xs text-ink-subtle"> · ya la tiene</span>}</span>
                      {!marcados[i] && <span className="block text-xs text-ink-muted">{dosis[i]} · {momentos[i]}</span>}
                    </span>
                  </label>
                  {marcados[i] && (
                    <div className="grid gap-1.5 sm:grid-cols-2 mt-1">
                      <input value={dosis[i]} onChange={(e) => setDosis((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))} maxLength={MAX_DOSE}
                        placeholder="Dosis (ej. 2 cápsulas)" aria-label={`Dosis de ${p.name}`} className={`${cls} w-full !py-2 text-xs`} />
                      <input value={momentos[i]} onChange={(e) => setMomentos((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))} maxLength={MAX_TIMING}
                        placeholder="Cuándo (ej. antes de dormir)" aria-label={`Cuándo tomar ${p.name}`} className={`${cls} w-full !py-2 text-xs`} />
                      <input value={enlaces[i]} onChange={(e) => setEnlaces((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))} inputMode="url"
                        placeholder="Enlace para comprarlo (https://…)" aria-label={`Enlace de ${p.name}`} className={`${cls} w-full !py-2 text-xs sm:col-span-2`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <label className="block mt-3">
            <span className="block text-xs text-ink-muted mb-1">Nota que verán junto a cada uno</span>
            <input value={notaHabitual} onChange={(e) => setNotaHabitual(e.target.value)} maxLength={MAX_NOTE} aria-label="Nota de la pauta habitual" className={`${cls} w-full`} />
          </label>
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <button type="button" onClick={anadirHabitual} disabled={habEstado === "loading"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
              {habEstado === "loading" ? "Añadiendo…" : `Añadir los marcados (${marcados.filter(Boolean).length})`}
            </button>
            {habMsg && <span className={`text-sm ${habEstado === "error" ? "text-danger" : "text-brand"}`}>{habMsg}</span>}
          </div>
        </div>

        <p className="text-xs text-ink-muted mb-2">O añade uno distinto:</p>
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
            {msg && <span className={`text-sm ${estado === "error" ? "text-danger" : "text-brand"}`}>{msg}</span>}
          </div>
        </form>

        {items.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-xs text-ink-muted">Su pauta ({items.length}). Pulsa «Editar» para cambiarle la dosis o cualquier otra cosa:</p>
            {items.map((s) => (
              <div key={s.id} className="rounded-lg border border-line px-4 py-2.5">
                {editando === s.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <input value={ed.name} onChange={(e) => setEd((v) => ({ ...v, name: e.target.value }))} maxLength={MAX_NAME}
                        placeholder="Suplemento" aria-label={`Nombre de ${s.name}`} className={`${cls} flex-1 min-w-[140px] !py-2 text-xs`} />
                      <input value={ed.dose} onChange={(e) => setEd((v) => ({ ...v, dose: e.target.value }))} maxLength={MAX_DOSE}
                        placeholder="Dosis (ej. 3 cápsulas)" aria-label={`Dosis de ${s.name}`} className={`${cls} w-40 !py-2 text-xs`} />
                    </div>
                    <input value={ed.timing} onChange={(e) => setEd((v) => ({ ...v, timing: e.target.value }))} maxLength={MAX_TIMING}
                      placeholder="Cuándo tomarlo" aria-label={`Cuándo tomar ${s.name}`} className={`${cls} w-full !py-2 text-xs`} />
                    <input value={ed.url} onChange={(e) => setEd((v) => ({ ...v, url: e.target.value }))} inputMode="url"
                      placeholder="Enlace para comprarlo (https://…)" aria-label={`Enlace de ${s.name}`} className={`${cls} w-full !py-2 text-xs`} />
                    <textarea value={ed.note} onChange={(e) => setEd((v) => ({ ...v, note: e.target.value }))} rows={2} maxLength={MAX_NOTE}
                      placeholder="Nota" aria-label={`Nota de ${s.name}`} className={`${cls} w-full !py-2 text-xs`} />
                    <div className="flex items-center gap-3 flex-wrap">
                      <button type="button" onClick={guardarEdicion} disabled={edEstado === "loading"} className="btn-brand text-xs px-4 !min-h-[40px] disabled:opacity-60">
                        {edEstado === "loading" ? "Guardando…" : "Guardar cambios"}
                      </button>
                      <button type="button" onClick={() => { setEditando(null); setEdMsg(""); }} className="text-xs text-ink-muted min-h-[40px] px-2">Cancelar</button>
                      {edMsg && <span className="text-xs text-danger">{edMsg}</span>}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm text-ink truncate">💊 {s.name}</span>
                        {pauta(s) && <span className="block text-xs text-ink-muted">{pauta(s)}</span>}
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-h-[40px] inline-flex items-center text-brand text-sm">Enlace</a>}
                        <button type="button" onClick={() => abrirEdicion(s)}
                          className="min-h-[40px] inline-flex items-center text-xs font-semibold text-brand hover:underline shrink-0">Editar</button>
                        <button type="button" onClick={() => borrar(s.id, s.name)}
                          className="min-h-[40px] inline-flex items-center text-xs font-semibold text-danger hover:underline shrink-0">✕ Quitar</button>
                      </span>
                    </div>
                    {s.note && <p className="text-xs text-ink-muted mt-1.5 whitespace-pre-wrap border-t border-line pt-1.5">💬 {s.note}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
