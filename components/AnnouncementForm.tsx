"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Publicación de un comunicado (solo la coach). Al publicar se avisa por email
 * y notificación a todas las clientas, así que se confirma antes de enviar. */
export default function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!body.trim()) { setStatus("error"); setMsg("Escribe el comunicado."); return; }
    if (!confirm("¿Publicar el comunicado? Se avisará por email y notificación a todas tus clientas.")) return;

    setStatus("sending"); setMsg("");
    try {
      const res = await fetch("/api/miembros/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
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
      setTitle(""); setBody(""); setStatus("idle");
      setMsg(typeof d.notified === "number" ? `Publicado. Avisadas ${d.notified} clientas.` : "Publicado.");
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
        placeholder="Título (opcional, ej. Cambio de horario de la videollamada)" className={cls} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000}
        placeholder="Escribe aquí tu comunicado…" aria-label="Comunicado" className={cls} />
      {msg && <p className={`text-sm ${status === "error" ? "text-[#FF6B6B]" : "text-[#1CA0E3]"}`}>{msg}</p>}
      <button type="submit" disabled={status === "sending"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "sending" ? "Publicando y avisando…" : "Publicar y avisar"}
      </button>
    </form>
  );
}
