"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROFILE_FIELDS, type Questionnaire } from "@/lib/profile";

export default function ProfileForm({
  initialName,
  initialQuestionnaire,
  photoUrl,
}: {
  initialName: string;
  initialQuestionnaire: Questionnaire;
  photoUrl?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [q, setQ] = useState<Questionnaire>(initialQuestionnaire);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  function set(id: string, v: string) {
    setQ((p) => ({ ...p, [id]: v }));
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/miembros/perfil/foto", { method: "POST", body: fd });
      if (res.ok) router.refresh();
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (status === "saving") return;
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/miembros/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name, questionnaire: q }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus("error");
        setMsg(d.error ?? "No se pudo guardar.");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("Error de conexión.");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]";

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      {/* Foto + nombre */}
      <div className="card-dark p-6 !transform-none flex items-center gap-5 flex-wrap">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#252525] flex items-center justify-center shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Tu foto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🙂</span>
          )}
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-[#A0A0A0] mb-1">Nombre (cómo te verán en la comunidad)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} maxLength={60} />
          <label className="inline-flex items-center gap-2 mt-3 text-sm text-[#A0A0A0] cursor-pointer">
            <span className="rounded-lg bg-[#CAFF00] text-[#0A0A0A] font-bold px-3 py-1.5 text-xs">{photoBusy ? "Subiendo…" : "Cambiar foto"}</span>
            <input type="file" accept="image/*" className="hidden" disabled={photoBusy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
          </label>
        </div>
      </div>

      {/* Cuestionario */}
      <div className="card-dark p-6 !transform-none">
        <h3 className="font-bold text-white mb-1">Tu cuestionario</h3>
        <p className="text-sm text-[#A0A0A0] mb-5">Estos datos nos sirven para crear tu plan personalizado.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.map((f) => (
            <div key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="block text-xs text-[#A0A0A0] mb-1">{f.label}</label>
              {f.type === "select" ? (
                <select value={q[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} className={inputCls}>
                  <option value="">Selecciona…</option>
                  {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={q[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} value={q[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} className={inputCls} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button type="submit" disabled={status === "saving"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
            {status === "saving" ? "Guardando…" : "Guardar perfil"}
          </button>
          {status === "saved" && <span className="text-sm text-[#CAFF00]">Guardado ✓</span>}
          {status === "error" && <span className="text-sm text-[#FF6B6B]">{msg}</span>}
        </div>
      </div>
    </form>
  );
}
