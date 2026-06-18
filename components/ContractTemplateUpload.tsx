"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Subida/reemplazo/borrado de la plantilla de contrato (solo coach). PDF único para todas. */
export default function ContractTemplateUpload({ hasTemplate }: { hasTemplate: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "deleting" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "deleting") return;
    if (!file) { setStatus("error"); setMsg("Adjunta el PDF del contrato."); return; }
    setStatus("loading"); setMsg("");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("file", file);
      const res = await fetch("/api/miembros/contrato/plantilla", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo subir."); return; }
      setTitle(""); setFile(null); setStatus("idle");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  async function remove() {
    if (status === "loading" || status === "deleting") return;
    if (!confirm("¿Borrar el contrato actual? Las clientas dejarán de verlo hasta que subas uno nuevo. Las firmas ya hechas se conservan.")) return;
    setStatus("deleting"); setMsg("");
    try {
      const res = await fetch("/api/miembros/contrato/plantilla", { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo borrar."); return; }
      setStatus("idle");
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const busy = status === "loading" || status === "deleting";
  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional, ej. Contrato de servicios 2026)" className={cls} />
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="PDF del contrato"
        className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white" />
      {status === "error" && <p className="text-sm text-[#FF6B6B]">{msg}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={busy} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
          {status === "loading" ? "Subiendo…" : hasTemplate ? "Reemplazar contrato" : "Subir contrato"}
        </button>
        {hasTemplate && (
          <button type="button" onClick={remove} disabled={busy}
            className="text-sm px-5 py-3 rounded-xl border border-[#FF6B6B]/40 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-colors disabled:opacity-60">
            {status === "deleting" ? "Borrando…" : "Borrar contrato actual"}
          </button>
        )}
      </div>
      {hasTemplate && (
        <p className="text-xs text-[#666666]">Al reemplazarlo, las clientas que ya firmaron deberán firmar la nueva versión. Borrarlo lo retira hasta que subas otro.</p>
      )}
    </form>
  );
}
