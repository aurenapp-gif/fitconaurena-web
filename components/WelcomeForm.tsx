"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { resizeImage } from "@/lib/image";

/** Pantalla inicial obligatoria: nombre, foto y aceptación con casilla no
 * premarcada. Los textos legales completos están en /legal/*: aquí solo se
 * resumen los puntos clave y se enlaza a las páginas, como en cualquier alta. */
export default function WelcomeForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
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

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
          className="accent-[#1CA0E3] w-5 h-5 mt-0.5 shrink-0" />
        <span className="text-sm text-[#A0A0A0]">
          He leído y acepto la{" "}
          <Link href="/legal/privacidad" target="_blank" className="text-[#1CA0E3] underline">política de privacidad</Link>,
          la{" "}
          <Link href="/legal/cookies" target="_blank" className="text-[#1CA0E3] underline">política de cookies</Link>
          {" "}y los{" "}
          <Link href="/legal/terminos" target="_blank" className="text-[#1CA0E3] underline">términos y condiciones</Link>.
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
