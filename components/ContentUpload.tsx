"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Section = { id: number; name: string };

export default function ContentUpload({ sections = [] }: { sections?: Section[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!title || !file) {
      setStatus("error");
      setMessage("Pon un título y adjunta un archivo.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      if (sectionId) fd.append("section_id", sectionId);
      fd.append("file", file);
      const res = await fetch("/api/miembros/contenido", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo subir.");
        return;
      }
      setTitle("");
      setDescription("");
      setSectionId("");
      setFile(null);
      setStatus("idle");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-dark p-6 !transform-none border-[#1CA0E3]/30 mb-8">
      <h3 className="font-bold text-white mb-4">Subir contenido (admin)</h3>
      <div className="flex flex-col gap-3">
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Título" aria-label="Título"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]"
        />
        <input
          type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)" aria-label="Descripción"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]"
        />
        <select
          value={sectionId} onChange={(e) => setSectionId(e.target.value)} aria-label="Sección"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#1CA0E3]"
        >
          <option value="">Sin sección</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-label="Archivo"
          className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white"
        />
        {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{message}</p>}
        <button
          type="submit" disabled={status === "loading"}
          className="btn-brand text-sm px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed self-start"
        >
          {status === "loading" ? "Subiendo…" : "Subir"}
        </button>
        <p className="text-xs text-[#666666]">
          Para archivos grandes (vídeos pesados), avísame y activamos subida directa.
        </p>
      </div>
    </form>
  );
}
