"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image";

const PHOTOS = [
  { field: "photo_front", label: "Frente" },
  { field: "photo_side", label: "Perfil" },
  { field: "photo_back", label: "Espaldas" },
] as const;

const MEASURES = [
  { field: "waist", label: "Cintura" },
  { field: "hips", label: "Cadera" },
  { field: "chest", label: "Pecho" },
  { field: "arm", label: "Brazo" },
  { field: "thigh", label: "Pierna" },
] as const;

export default function CheckinForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [showMeasures, setShowMeasures] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [celebrate, setCelebrate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const anyPhoto = Object.values(files).some(Boolean);
    const anyMeasure = Object.values(measures).some((v) => v.trim() !== "");
    if (!weight && !note && !anyPhoto && !anyMeasure) {
      setStatus("error");
      setMessage("Añade al menos peso, medidas, nota o foto.");
      return;
    }
    setStatus("loading");
    setMessage("");
    setCelebrate("");
    try {
      const fd = new FormData();
      fd.append("weight", weight);
      fd.append("note", note);
      for (const m of MEASURES) {
        const v = (measures[m.field] ?? "").trim();
        if (v) fd.append(m.field, v);
      }
      for (const p of PHOTOS) {
        const f = files[p.field];
        if (f) fd.append(p.field, await resizeImage(f));
      }
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
      setMeasures({});
      formRef.current?.reset();
      setStatus("idle");
      // Celebración de hito si el servidor la indica.
      if (typeof data.celebrate === "string" && data.celebrate) setCelebrate(data.celebrate);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card-dark p-6 !transform-none border-[#1CA0E3]/30">
      <h3 className="font-bold text-white mb-4">Nuevo check-in</h3>
      <div className="flex flex-col gap-3">
        <input
          type="number" step="0.1" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)} placeholder="Peso (kg)" aria-label="Peso en kg"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]"
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
                <span className={`w-full rounded-lg border px-2 py-3 text-[11px] ${files[p.field] ? "border-[#1CA0E3] text-[#1CA0E3] bg-[#1CA0E3]/5" : "border-[#252525] text-[#666666]"}`}>
                  {files[p.field] ? "✓ Lista" : "Elegir"}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setFiles((f) => ({ ...f, [p.field]: e.target.files?.[0] ?? null }))} />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-4">
          <button
            type="button"
            onClick={() => setShowMeasures((s) => !s)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-semibold text-white">📏 Medidas (cm) — opcional</span>
            <span className="text-[#666666] text-sm">{showMeasures ? "Ocultar −" : "Añadir +"}</span>
          </button>
          {showMeasures && (
            <>
              <p className="text-xs text-[#A0A0A0] mt-1 mb-3">
                Cuando la báscula no se mueve, las medidas demuestran que sí avanzas. Mídete relajada y siempre igual.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MEASURES.map((m) => (
                  <label key={m.field} className="flex flex-col gap-1">
                    <span className="text-[11px] text-[#A0A0A0]">{m.label}</span>
                    <input
                      type="number" step="0.1" inputMode="decimal"
                      value={measures[m.field] ?? ""}
                      onChange={(e) => setMeasures((v) => ({ ...v, [m.field]: e.target.value }))}
                      placeholder="cm" aria-label={`${m.label} en cm`}
                      className="rounded-lg border border-[#252525] bg-[#141414] px-3 py-2 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]"
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3">
          <p className="text-xs text-[#A0A0A0]">
            ⚖️ Pésate <strong className="text-white">en ayunas</strong>, después de la primera orina de la mañana.
          </p>
        </div>

        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="¿Cómo te has sentido esta semana? (opcional)" aria-label="Nota"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3] resize-none"
        />
        {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{message}</p>}
        {celebrate && (
          <p className="text-sm font-bold text-[#1CA0E3] bg-[#1CA0E3]/10 border border-[#1CA0E3]/30 rounded-lg px-4 py-3">
            {celebrate}
          </p>
        )}
        <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
          {status === "loading" ? "Guardando…" : "Guardar check-in"}
        </button>
      </div>
    </form>
  );
}
