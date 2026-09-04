"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Publica el diferido de la llamada grupal (enlace + fecha). Solo la coach.
 * El aviso a las clientas es opcional: a veces solo se quiere dejar colgada la
 * grabación sin mandar otro correo. */
export default function GroupCallForm() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!date) { setStatus("error"); setMsg("Indica la fecha de la llamada."); return; }
    if (!link.trim()) { setStatus("error"); setMsg("Pega el enlace de la grabación."); return; }
    if (notify && !confirm("¿Publicar la grabación? Se avisará a todas tus clientas.")) return;

    setStatus("sending"); setMsg("");
    try {
      const res = await fetch("/api/miembros/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "llamada", call_date: date, link: link.trim(), body: note, notify }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        if (d.setup) { setMsg("Falta ejecutar el SQL en Supabase. Arriba lo tienes."); router.refresh(); }
        else setMsg(d.error ?? "No se pudo publicar.");
        return;
      }
      setDate(""); setLink(""); setNote(""); setStatus("idle");
      setMsg(d.notify ? `Publicada. Avisadas ${d.notified} clientas.` : "Publicada (sin avisar).");
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Fecha de la llamada</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls} />
      </label>
      <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url"
        placeholder="Enlace de la grabación (https://…)" aria-label="Enlace de la grabación" className={cls} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={4000}
        placeholder="Nota (opcional): temas tratados, minuto clave…" aria-label="Nota" className={cls} />
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-brand w-4 h-4" />
        Avisar a las clientas por email y notificación
      </label>
      {msg && <p className={`text-sm ${status === "error" ? "text-danger" : "text-brand"}`}>{msg}</p>}
      <button type="submit" disabled={status === "sending"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "sending" ? "Publicando…" : "Publicar grabación"}
      </button>
    </form>
  );
}
