"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Sube una plantilla nueva (contrato o anexo de salud). La coach puede subir
 * varias plantillas de contrato (por ejemplo, por precio) y una sola de anexo
 * de salud, común a todas las clientas.
 */
export default function ContractTemplateUpload() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"contrato" | "anexo_salud">("contrato");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!title.trim()) { setStatus("error"); setMsg("Pon un título."); return; }
    if (!file) { setStatus("error"); setMsg("Adjunta el PDF."); return; }
    setStatus("loading"); setMsg("");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/miembros/contrato/plantilla", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo subir."); return; }
      setTitle(""); setFile(null); setStatus("idle");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="block text-xs text-[#A0A0A0] mb-1.5">Tipo</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setKind("contrato")}
            className={`px-4 py-2 text-xs font-bold rounded-lg border ${kind === "contrato" ? "bg-[#1CA0E3] border-[#1CA0E3] text-white" : "border-[#252525] text-[#A0A0A0]"}`}>Contrato</button>
          <button type="button" onClick={() => setKind("anexo_salud")}
            className={`px-4 py-2 text-xs font-bold rounded-lg border ${kind === "anexo_salud" ? "bg-[#1CA0E3] border-[#1CA0E3] text-white" : "border-[#252525] text-[#A0A0A0]"}`}>Anexo de salud</button>
        </div>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "anexo_salud" ? "Anexo de salud 2026" : "Contrato Programa 1497"}
        className={cls} />
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="PDF de la plantilla"
        className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white" />
      {status === "error" && <p className="text-sm text-[#FF6B6B]">{msg}</p>}
      <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
        {status === "loading" ? "Subiendo…" : "Subir plantilla"}
      </button>
    </form>
  );
}
