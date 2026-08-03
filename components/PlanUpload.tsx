"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PlanUpload({ member }: { member: string }) {
  const router = useRouter();
  const [type, setType] = useState("nutricion");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!file) { setStatus("error"); setMsg("Adjunta el archivo."); return; }
    setStatus("loading"); setMsg("");
    try {
      const fd = new FormData();
      fd.append("member", member);
      fd.append("type", type);
      fd.append("title", title);
      fd.append("note", note);
      fd.append("file", file);
      const res = await fetch("/api/miembros/clientas/plan", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo subir."); return; }
      setTitle(""); setNote(""); setFile(null); setStatus("idle");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
        <select value={type} onChange={(e) => setType(e.target.value)} className={cls}>
          <option value="nutricion">Nutrición</option>
          <option value="entrenamiento">Entrenamiento</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" className={`${cls} flex-1`} />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Comentario para la clienta (opcional): indicaciones, cambios respecto al mes anterior…"
        aria-label="Comentario para la clienta"
        className={cls}
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Archivo del plan"
        className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white" />
      {status === "error" && <p className="text-sm text-[#FF6B6B]">{msg}</p>}
      <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "loading" ? "Subiendo…" : "Subir plan"}
      </button>
    </form>
  );
}
