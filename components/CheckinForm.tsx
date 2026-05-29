"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckinForm() {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!weight && !note && !photo) {
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
      if (photo) fd.append("photo", photo);
      const res = await fetch("/api/miembros/checkin", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo guardar.");
        return;
      }
      setWeight("");
      setNote("");
      setPhoto(null);
      (e.target as HTMLFormElement).reset();
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-dark p-6 !transform-none border-[#CAFF00]/30">
      <h3 className="font-bold text-white mb-4">Nuevo check-in</h3>
      <div className="flex flex-col gap-3">
        <input
          type="number" step="0.1" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)} placeholder="Peso (kg)" aria-label="Peso en kg"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]"
        />
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="¿Cómo te has sentido esta semana? (opcional)" aria-label="Nota"
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] resize-none"
        />
        <input
          type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} aria-label="Foto"
          className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#CAFF00] file:px-4 file:py-2 file:font-bold file:text-[#0A0A0A]"
        />
        {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{message}</p>}
        <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
          {status === "loading" ? "Guardando…" : "Guardar check-in"}
        </button>
      </div>
    </form>
  );
}
