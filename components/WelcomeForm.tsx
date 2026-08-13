"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resizeImage } from "@/lib/image";
import { PRIVACY_TEXT, TERMS_TEXT, IMAGE_TEXT, WITHDRAWAL_TEXT } from "@/lib/terms";

function Bloque({ titulo, puntos }: { titulo: string; puntos: string[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-bold uppercase tracking-wide text-[#1CA0E3] mb-1.5">{titulo}</p>
      <ul className="flex flex-col gap-1.5">
        {puntos.map((p, i) => (
          <li key={i} className="text-xs text-[#A0A0A0] leading-relaxed">• {p}</li>
        ))}
      </ul>
    </div>
  );
}

export default function WelcomeForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false); // nunca marcada de inicio
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function pickPhoto(f: File | null) {
    if (!f) { setPhoto(null); setPreview(null); return; }
    try {
      const small = await resizeImage(f);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setPhoto(f);
      setPreview(URL.createObjectURL(f));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "saving") return;
    if (!name.trim()) { setStatus("error"); setMsg("Escribe tu nombre."); return; }
    if (!photo) { setStatus("error"); setMsg("Sube tu foto de perfil."); return; }
    if (!accepted) { setStatus("error"); setMsg("Marca la casilla para aceptar las condiciones."); return; }

    setStatus("saving"); setMsg("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("photo", photo);
      fd.append("accepted", "true");
      const res = await fetch("/api/miembros/bienvenida", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus("error"); setMsg(d.error ?? "No se pudo guardar.");
        return;
      }
      router.replace("/miembros");
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-white">Tu nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
          placeholder="Cómo quieres que te llame" className={cls} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-white">Tu foto de perfil</span>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#161616] border border-[#252525] flex items-center justify-center shrink-0">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-[#666666]">{(name || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
            aria-label="Foto de perfil"
            className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white" />
        </div>
      </div>

      <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-4 max-h-64 overflow-y-auto">
        <Bloque titulo="Privacidad y tus datos" puntos={PRIVACY_TEXT} />
        <Bloque titulo="Condiciones del servicio" puntos={TERMS_TEXT} />
        <Bloque titulo="Confidencialidad e imagen" puntos={IMAGE_TEXT} />
        <Bloque titulo="Inicio inmediato y desistimiento" puntos={WITHDRAWAL_TEXT} />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
          className="accent-[#1CA0E3] w-5 h-5 mt-0.5 shrink-0" />
        <span className="text-sm text-[#A0A0A0]">
          He leído y acepto la <strong className="text-white">política de privacidad</strong> y los{" "}
          <strong className="text-white">términos y condiciones</strong>. Solicito que el servicio empiece
          ya y entiendo que perderé el derecho de desistimiento cuando se haya ejecutado por completo.
        </span>
      </label>

      {msg && <p role="alert" className="text-sm text-[#FF6B6B]">{msg}</p>}

      <button type="submit" disabled={status === "saving" || !accepted}
        className="btn-brand text-base px-8 py-3.5 self-start disabled:opacity-50 disabled:cursor-not-allowed">
        {status === "saving" ? "Guardando…" : "Empezar"}
      </button>
    </form>
  );
}
