"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_MB = 300;

export default function TechniqueReply({ id }: { id: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");

  const busy = status !== "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!reply.trim() && !file) { setError("Escribe una corrección o adjunta un vídeo."); return; }
    if (file && file.size > MAX_MB * 1024 * 1024) { setError(`El vídeo es muy grande (máx. ${MAX_MB} MB).`); return; }

    try {
      let reply_path: string | undefined;
      if (file) {
        const signRes = await fetch("/api/miembros/tecnica/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, kind: "reply" }),
        });
        const signData = await signRes.json().catch(() => ({}));
        if (!signRes.ok) { setError(signData.error ?? "No se pudo preparar la subida."); return; }
        setStatus("uploading");
        const up = await fetch(signData.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4" }, body: file });
        if (!up.ok) { setStatus("idle"); setError("Falló la subida del vídeo."); return; }
        reply_path = signData.path;
      }
      setStatus("saving");
      const res = await fetch("/api/miembros/tecnica/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reply, reply_path }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("idle"); setError(d.error ?? "No se pudo guardar."); return; }
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("idle");
      setError("Error de conexión.");
    }
  }

  const label = status === "uploading" ? "Subiendo vídeo…" : status === "saving" ? "Guardando…" : "Enviar corrección";
  const inputCls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]";

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 border-t border-[#252525] pt-3">
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribe tu corrección…" aria-label="Corrección" rows={3} maxLength={2000} className={inputCls} />
      <label className="text-xs text-[#A0A0A0]">Vídeo de respuesta (opcional):</label>
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Vídeo de respuesta" className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#CAFF00] file:px-4 file:py-2 file:font-bold file:text-[#0A0A0A]" />
      {error && <p role="alert" className="text-sm text-[#FF6B6B]">{error}</p>}
      <button type="submit" disabled={busy} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60 self-start">{label}</button>
    </form>
  );
}
