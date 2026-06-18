"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AudioRecorder, { audioExt } from "@/components/AudioRecorder";

const MAX_MB = 300;

export default function TechniqueReply({ id }: { id: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");

  const busy = status !== "idle";

  // Envía la corrección: texto + (vídeo adjunto O nota de voz grabada).
  async function submitReply(media: File | null) {
    if (busy) return;
    setError("");
    if (!reply.trim() && !media) { setError("Escribe una corrección, adjunta un vídeo o graba un audio."); return; }
    if (media && media.size > MAX_MB * 1024 * 1024) { setError(`El archivo es muy grande (máx. ${MAX_MB} MB).`); return; }

    try {
      let reply_path: string | undefined;
      let pathToken: string | undefined;
      if (media) {
        const signRes = await fetch("/api/miembros/tecnica/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: media.name, kind: "reply" }),
        });
        const signData = await signRes.json().catch(() => ({}));
        if (!signRes.ok) { setError(signData.error ?? "No se pudo preparar la subida."); return; }
        setStatus("uploading");
        const up = await fetch(signData.uploadUrl, { method: "PUT", headers: { "Content-Type": media.type || "video/mp4" }, body: media });
        if (!up.ok) { setStatus("idle"); setError("Falló la subida."); return; }
        reply_path = signData.path;
        pathToken = signData.pathToken;
      }
      setStatus("saving");
      const res = await fetch("/api/miembros/tecnica/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reply, reply_path, pathToken }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("idle"); setError(d.error ?? "No se pudo guardar."); return; }
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("idle");
      setError("Error de conexión.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitReply(file);
  }

  // El prefijo "audio-" permite distinguir la nota de voz de un vídeo al renderizar.
  async function handleAudio(blob: Blob, mime: string) {
    const f = new File([blob], `audio-correccion.${audioExt(mime)}`, { type: mime.split(";")[0] });
    await submitReply(f);
  }

  const label = status === "uploading" ? "Subiendo…" : status === "saving" ? "Guardando…" : "Enviar corrección";
  const inputCls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 border-t border-[#252525] pt-3">
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribe tu corrección…" aria-label="Corrección" rows={3} maxLength={2000} className={inputCls} />
      <label className="text-xs text-[#A0A0A0]">Vídeo de respuesta (opcional):</label>
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Vídeo de respuesta" className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white" />
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-[#A0A0A0]">O graba una nota de voz:</span>
        <AudioRecorder onSend={handleAudio} disabled={busy} sendLabel="Enviar audio" />
      </div>
      {error && <p role="alert" className="text-sm text-[#FF6B6B]">{error}</p>}
      <button type="submit" disabled={busy} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60 self-start">{label}</button>
    </form>
  );
}
