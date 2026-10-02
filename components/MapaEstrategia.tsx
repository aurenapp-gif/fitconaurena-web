"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_DETALLE, MAX_FASES, MAX_TITULO, type Fase } from "@/lib/estrategia";

type Fila = { titulo: string; detalle: string };

/**
 * El mapa de la estrategia de una clienta, para que lo escriba la coach.
 *
 * Se guarda entero de una vez en vez de fase a fase: así se puede reordenar,
 * borrar y añadir antes de guardar, y lo que se ve en pantalla es exactamente
 * lo que va a quedar.
 */
export default function MapaEstrategia({
  email,
  inicial,
  actualInicial,
  otras,
}: {
  email: string;
  inicial: Fase[];
  actualInicial: number | null;
  /** Otras clientas con mapa, para copiarlo en vez de escribirlo de nuevo. */
  otras: { email: string; nombre: string }[];
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(
    inicial.length > 0
      ? inicial.map((f) => ({ titulo: f.titulo, detalle: f.detalle ?? "" }))
      : [{ titulo: "", detalle: "" }]
  );
  const [actual, setActual] = useState<number | null>(actualInicial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [copiarDe, setCopiarDe] = useState("");

  const conTitulo = filas.filter((f) => f.titulo.trim() !== "").length;

  function cambiar(i: number, campo: keyof Fila, v: string) {
    setFilas((p) => p.map((f, k) => (k === i ? { ...f, [campo]: v } : f)));
    setEstado("idle");
  }

  function mover(i: number, salto: number) {
    const j = i + salto;
    if (j < 0 || j >= filas.length) return;
    const copia = [...filas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setFilas(copia);
    // La fase en curso es una posición, así que al mover una fila hay que
    // mover también la marca si era una de las dos que se han cruzado.
    if (actual === i + 1) setActual(j + 1);
    else if (actual === j + 1) setActual(i + 1);
    setEstado("idle");
  }

  function quitar(i: number) {
    const copia = filas.filter((_, k) => k !== i);
    setFilas(copia.length > 0 ? copia : [{ titulo: "", detalle: "" }]);
    if (actual !== null) {
      if (actual === i + 1) setActual(null);
      else if (actual > i + 1) setActual(actual - 1);
    }
    setEstado("idle");
  }

  async function guardar() {
    if (estado === "guardando") return;
    setEstado("guardando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/estrategia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fases: filas, actual }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo guardar."); return; }
      setEstado("ok");
      setMsg(d.actual ? `Guardado. Ve por la fase ${d.actual} de ${d.fases}.` : "Guardado. Marca por qué fase va para que lo vea ella.");
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  async function copiar() {
    if (!copiarDe || estado === "guardando") return;
    setEstado("guardando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/estrategia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, desde: copiarDe }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo copiar."); return; }
      setEstado("ok"); setMsg(`Copiadas ${d.fases} fases. Repásalas y marca por cuál va.`);
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  const input = "w-full rounded-xl border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {filas.map((f, i) => {
          const esActual = actual === i + 1;
          return (
            <div key={i} className={`rounded-xl border p-3 ${esActual ? "border-brand bg-brand/5" : "border-line"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-ink-subtle w-10 shrink-0">Fase {i + 1}</span>
                <input
                  value={f.titulo}
                  onChange={(e) => cambiar(i, "titulo", e.target.value)}
                  maxLength={MAX_TITULO}
                  placeholder="Nombre de la fase"
                  className={input}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0}
                    aria-label={`Subir la fase ${i + 1}`}
                    className="min-h-[36px] w-9 rounded-lg border border-line text-ink-muted disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === filas.length - 1}
                    aria-label={`Bajar la fase ${i + 1}`}
                    className="min-h-[36px] w-9 rounded-lg border border-line text-ink-muted disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => quitar(i)}
                    aria-label={`Quitar la fase ${i + 1}`}
                    className="min-h-[36px] w-9 rounded-lg border border-line text-warn">✕</button>
                </div>
              </div>
              <textarea
                value={f.detalle}
                onChange={(e) => cambiar(i, "detalle", e.target.value)}
                maxLength={MAX_DETALLE}
                rows={2}
                placeholder="Qué se hace en esta fase (lo lee ella)"
                className={input}
              />
              <label className="flex items-center gap-2 mt-2 text-sm text-ink-muted cursor-pointer">
                <input type="radio" name={`actual-${email}`} checked={esActual}
                  onChange={() => { setActual(i + 1); setEstado("idle"); }} />
                Va por aquí ahora
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" disabled={filas.length >= MAX_FASES}
          onClick={() => { setFilas((p) => [...p, { titulo: "", detalle: "" }]); setEstado("idle"); }}
          className="btn-outline text-sm px-4 py-2 disabled:opacity-40">+ Añadir fase</button>
        {actual !== null && (
          <button type="button" onClick={() => { setActual(null); setEstado("idle"); }}
            className="text-sm text-ink-muted underline">Quitar la marca de fase</button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={guardar} disabled={estado === "guardando"}
          className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">
          {estado === "guardando" ? "Guardando…" : "Guardar el mapa"}
        </button>
        {msg && <span className={`text-sm ${estado === "error" ? "text-warn" : "text-brand"}`}>{msg}</span>}
      </div>

      {conTitulo > 0 && actual === null && (
        <p className="text-xs text-ink-subtle">
          Mientras no marques por qué fase va, ella no ve el mapa.
        </p>
      )}

      {otras.length > 0 && (
        <div className="border-t border-line pt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-subtle">Copiar el mapa de otra clienta:</span>
          <select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}
            aria-label="Clienta de la que copiar el mapa"
            className="rounded-xl border border-line bg-page px-3 py-2 text-sm text-ink">
            <option value="">— elige —</option>
            {otras.map((o) => <option key={o.email} value={o.email}>{o.nombre}</option>)}
          </select>
          <button type="button" onClick={copiar} disabled={!copiarDe || estado === "guardando"}
            className="btn-outline text-sm px-4 py-2 disabled:opacity-40">Copiar</button>
          <span className="text-xs text-ink-subtle w-full">Copia los textos, no por dónde va la otra.</span>
        </div>
      )}
    </div>
  );
}
