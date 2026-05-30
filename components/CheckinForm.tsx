"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const PHOTOS = [
  { field: "photo_front", label: "Frente" },
  { field: "photo_side", label: "Perfil" },
  { field: "photo_back", label: "Espaldas" },
] as const;

export default function CheckinForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const anyPhoto = Object.values(files).some(Boolean);
    if (!weight && !note && !anyPhoto) {
      setStatus("error");
      setMessage("Añade al menos peso, nota o foto.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("weight", weight);
      fd.append("note", note);
      for (const p of PHOTOS) if (files[p.field]) fd.append(p.field, files[p.field] as File);
      const res = await fetch("/api/miembros/checkin", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo guardar.");
        return;
      }
      setWeight("");
      setNote("");
      setFiles({});
      formRef.current?.reset();
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card-dark p-6 !transform-none border-[#CAFF00]/30">
      <h3 className="font-bold text-white mb-4">Nuevo check-in</h3>
      <div className="flex flex-col gap-3">
        <input
          type="number" step="0.1" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)} placeholder="Peso (kg)" aria-label="Peso en kg"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]"
        />

        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-4">
          <p className="text-sm font-semibold text-white mb-1">📸 Sube 3 fotos: frente, perfil y espaldas</p>
          <p className="text-xs text-[#A0A0A0] mb-4">
            Hazlas siempre en el <strong className="text-white">mismo sitio</strong> y con la <strong className="text-white">misma luz</strong> (natural o artificial).
          </p>
          <div className="grid grid-cols-3 gap-3">
            {PHOTOS.map((p) => (
              <label key={p.field} className="flex flex-col items-center gap-2 cursor-pointer text-center">
                <span className="text-xs font-semibold text-white">{p.label}</span>
                <span className={`w-full rounded-lg border px-2 py-3 text-[11px] ${files[p.field] ? "border-[#CAFF00] text-[#CAFF00] bg-[#CAFF00]/5" : "border-[#252525] text-[#666666]"}`}>
                  {files[p.field] ? "✓ Lista" : "Elegir"}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setFiles((f) => ({ ...f, [p.field]: e.target.files?.[0] ?? null }))} />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3">
          <p className="text-xs text-[#A0A0A0]">
            ⚖️ Pésate <strong className="text-white">en ayunas</strong>, después de la primera orina de la mañana.
          </p>
        </div>

        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="¿Cómo te has sentido esta semana? (opcional)" aria-label="Nota"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] resize-none"
        />
        {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{message}</p>}
        <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
          {status === "loading" ? "Guardando…" : "Guardar check-in"}
        </button>
      </div>
    </form>
  );
}
