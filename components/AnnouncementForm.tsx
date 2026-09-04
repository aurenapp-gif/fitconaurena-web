"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OPCIONES_POR_DEFECTO, MAX_OPCIONES, MAX_LARGO_OPCION, sanearOpciones } from "@/lib/votaciones";

/** Publicación de un comunicado (solo la coach). Al publicar se avisa por email
 * y notificación a todas las clientas, así que se confirma antes de enviar. */
export default function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");
  // Votación: apagada por defecto. La mayoría de comunicados solo informan.
  const [votar, setVotar] = useState(false);
  const [opciones, setOpciones] = useState<string[]>(OPCIONES_POR_DEFECTO);

  const opcionesLimpias = sanearOpciones(opciones);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!body.trim()) { setStatus("error"); setMsg("Escribe el comunicado."); return; }
    if (votar && !opcionesLimpias) {
      setStatus("error"); setMsg("Para votar hacen falta al menos dos opciones distintas."); return;
    }
    if (!confirm("¿Publicar el comunicado? Se avisará por email y notificación a todas tus clientas.")) return;

    setStatus("sending"); setMsg("");
    try {
      const res = await fetch("/api/miembros/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, poll_options: votar ? opcionesLimpias : null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        if (d.setup) {
          // Falta la tabla: refrescamos para que aparezca arriba el aviso con
          // el SQL que hay que ejecutar en Supabase.
          setMsg("Falta crear la tabla en Supabase. Arriba tienes el SQL a ejecutar (un solo paso).");
          router.refresh();
        } else {
          setMsg(d.error ?? "No se pudo publicar.");
        }
        return;
      }
      setTitle(""); setBody(""); setStatus("idle"); setVotar(false); setOpciones(OPCIONES_POR_DEFECTO);
      setMsg(typeof d.notified === "number" ? `Publicado. Avisadas ${d.notified} clientas.` : "Publicado.");
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
        placeholder="Título (opcional, ej. Cambio de horario de la videollamada)" className={cls} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000}
        placeholder="Escribe aquí tu comunicado…" aria-label="Comunicado" className={cls} />
      {/* Votación */}
      <div className="rounded-xl border border-line bg-page px-4 py-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={votar} onChange={(e) => setVotar(e.target.checked)}
            className="w-4 h-4 accent-brand" />
          <span className="text-sm text-ink">🗳️ Que puedan votar</span>
        </label>
        <p className="text-xs text-ink-subtle mt-1 ml-7">
          Para preguntarles algo: «¿cambiamos la llamada grupal al jueves?». Cada clienta vota una vez y puede cambiar su voto.
        </p>

        {votar && (
          <div className="mt-3 ml-7 flex flex-col gap-2">
            {opciones.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-ink-subtle w-4 shrink-0">{i + 1}.</span>
                <input
                  value={o}
                  onChange={(e) => setOpciones(opciones.map((x, j) => (j === i ? e.target.value : x)))}
                  maxLength={MAX_LARGO_OPCION}
                  placeholder={`Opción ${i + 1}`}
                  aria-label={`Opción ${i + 1}`}
                  className={`${cls} flex-1 !py-2`}
                />
                {opciones.length > 2 && (
                  <button type="button" onClick={() => setOpciones(opciones.filter((_, j) => j !== i))}
                    aria-label={`Quitar la opción ${i + 1}`}
                    className="text-danger text-sm px-2 shrink-0">✕</button>
                )}
              </div>
            ))}
            {opciones.length < MAX_OPCIONES && (
              <button type="button" onClick={() => setOpciones([...opciones, ""])}
                className="btn-outline text-xs px-4 py-2 self-start">+ Añadir opción</button>
            )}
          </div>
        )}
      </div>

      {msg && <p className={`text-sm ${status === "error" ? "text-danger" : "text-brand"}`}>{msg}</p>}
      <button type="submit" disabled={status === "sending"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "sending" ? "Publicando y avisando…" : "Publicar y avisar"}
      </button>
    </form>
  );
}
