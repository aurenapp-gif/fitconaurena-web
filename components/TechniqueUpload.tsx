"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_SECONDS = 75; // ~60 seg con un pequeño margen
const MAX_MB = 300;

// Lee la duración del vídeo en el navegador (para avisar si es muy largo).
function getDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration || 0); };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
    v.src = URL.createObjectURL(file);
  });
}

export default function TechniqueUpload() {
  const router = useRouter();
  const [exercise, setExercise] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const busy = status !== "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!file) { setError("Adjunta un vídeo."); return; }
    if (!file.type.startsWith("video/")) { setError("El archivo debe ser un vídeo."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`El vídeo es muy grande (máx. ${MAX_MB} MB).`); return; }

    setStatus("checking");
    const dur = await getDuration(file);
    if (dur && dur > MAX_SECONDS) {
      setStatus("idle");
      setError(`El vídeo dura ${Math.round(dur)} s. Graba un clip más corto (máx. ~60 s, suficiente para una serie).`);
      return;
    }

    try {
      // 1) Pedir permiso de subida directa.
      const signRes = await fetch("/api/miembros/tecnica/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, kind: "video" }),
      });
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) { setStatus("idle"); setError(signData.error ?? "No se pudo preparar la subida."); return; }

      // 2) Subir el vídeo DIRECTO al almacenamiento (no pasa por el servidor).
      setStatus("uploading");
      const up = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });
      if (!up.ok) { setStatus("idle"); setError("Falló la subida del vídeo. Revisa tu conexión e inténtalo de nuevo."); return; }

      // 3) Registrar el vídeo.
      setStatus("saving");
      const rec = await fetch("/api/miembros/tecnica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise, note, video_path: signData.path, pathToken: signData.pathToken }),
      });
      if (!rec.ok) { const d = await rec.json().catch(() => ({})); setStatus("idle"); setError(d.error ?? "No se pudo guardar."); return; }

      setExercise(""); setNote(""); setFile(null); formRef.current?.reset();
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("idle");
      setError("Error de conexión. Inténtalo de nuevo.");
    }
  }

  const label = status === "checking" ? "Comprobando…" : status === "uploading" ? "Subiendo vídeo…" : status === "saving" ? "Guardando…" : "Enviar para corregir";
  const inputCls = "rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card-dark p-6 !transform-none border-brand/30 mb-8">
      <h3 className="font-bold text-ink mb-1">Sube tu vídeo de técnica</h3>
      <p className="text-sm text-ink-muted mb-4">Graba un clip corto de tu ejercicio (máx. ~60 s) y tu coach te lo corrige.</p>
      <div className="flex flex-col gap-3">
        <input type="text" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Ejercicio (ej. Sentadilla)" aria-label="Ejercicio" maxLength={120} className={inputCls} />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿Algo que quieras que mire? (opcional)" aria-label="Nota" rows={2} maxLength={1000} className={inputCls} />
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Vídeo" className="text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-bold file:text-white" />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy} className="btn-brand text-sm px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed self-start">{label}</button>
      </div>
    </form>
  );
}
