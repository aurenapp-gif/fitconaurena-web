"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Formulario para responder en el hilo de una pregunta. */
export default function ForumReply({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!body.trim()) { setStatus("error"); setMsg("Escribe una respuesta."); return; }
    setStatus("loading"); setMsg("");
    try {
      const res = await fetch(`/api/miembros/foro/${questionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo responder."); return; }
      setBody(""); setStatus("idle"); router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  return (
    <form onSubmit={submit} className="card-dark p-5 !transform-none border-[#1CA0E3]/30">
      <h3 className="font-bold text-white text-sm mb-3">Responder</h3>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Escribe tu respuesta…" maxLength={4000}
        className="w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3] resize-none" />
      {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B] mt-2">{msg}</p>}
      <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 mt-3 disabled:opacity-60">
        {status === "loading" ? "Enviando…" : "Responder"}
      </button>
    </form>
  );
}
