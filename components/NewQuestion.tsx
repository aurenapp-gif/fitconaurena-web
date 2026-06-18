"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Topic } from "@/lib/forum";

/** Formulario para publicar una pregunta nueva en el foro. */
export default function NewQuestion({ topics, defaultTopic }: { topics: Topic[]; defaultTopic: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState(defaultTopic ? String(defaultTopic) : "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const cls = "w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (title.trim().length < 5) { setStatus("error"); setMsg("Escribe una pregunta más concreta."); return; }
    setStatus("loading"); setMsg("");
    try {
      const res = await fetch("/api/miembros/foro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, topic_id: topic ? Number(topic) : null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus("error"); setMsg(d.error ?? "No se pudo publicar."); return; }
      if (d.id) router.push(`/miembros/foro/${d.id}`);
      else { setStatus("idle"); router.refresh(); }
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-brand text-sm px-6 py-3">
        Hacer una pregunta
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card-dark p-5 !transform-none border-[#1CA0E3]/30">
      <h3 className="font-bold text-white mb-3">Nueva pregunta</h3>
      <div className="flex flex-col gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tu pregunta (ej. ¿Cómo controlo el hambre por la tarde?)" maxLength={160} className={cls} />
        {topics.length > 0 && (
          <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Temática" className={cls}>
            <option value="">Sin temática</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Da más detalle si quieres (opcional)…" maxLength={4000} className={`${cls} resize-none`} />
        {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{msg}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
            {status === "loading" ? "Publicando…" : "Publicar pregunta"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-[#666666] hover:text-white">Cancelar</button>
        </div>
      </div>
    </form>
  );
}
