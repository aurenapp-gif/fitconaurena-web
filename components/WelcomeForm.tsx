"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { resizeImage } from "@/lib/image";

/** Pantalla inicial obligatoria: nombre y apellidos, dirección postal, foto y
 * aceptación con casilla no premarcada. La dirección se pide porque el programa
 * es contractual (12 meses) y las condiciones prevén acciones legales por
 * deuda: hace falta poder identificar a la clienta y notificarle. */
export default function WelcomeForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
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
    if (!name.trim()) { setStatus("error"); setMsg("Escribe cómo quieres que te llame."); return; }
    if (fullName.trim().split(/\s+/).length < 2) { setStatus("error"); setMsg("Escribe tu nombre y apellidos completos."); return; }
    if (address.trim().length < 5) { setStatus("error"); setMsg("Escribe tu dirección de residencia."); return; }
    if (!postalCode.trim()) { setStatus("error"); setMsg("Escribe tu código postal."); return; }
    if (!photo) { setStatus("error"); setMsg("Sube tu foto de perfil."); return; }
    if (!accepted) { setStatus("error"); setMsg("Marca la casilla para aceptar las condiciones."); return; }

    setStatus("saving"); setMsg("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("full_name", fullName.trim());
      fd.append("address", address.trim());
      fd.append("postal_code", postalCode.trim());
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

  const cls = "rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">¿Cómo quieres que te llame?</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
          placeholder="Tu nombre de pila" className={cls} />
      </label>

      <div className="rounded-xl border border-line bg-page p-4 flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">Datos para el contrato</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink">Nombre y apellidos completos</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120}
            autoComplete="name" placeholder="Como figura en tu DNI/pasaporte" className={cls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink">Dirección de residencia</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200}
            autoComplete="street-address" placeholder="Calle, número, piso, ciudad" className={cls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink">Código postal</span>
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={12}
            autoComplete="postal-code" placeholder="Ej. 28001 · 1500-328" inputMode="text" className={cls + " sm:w-40"} />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">Tu foto de perfil</span>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface border border-line flex items-center justify-center shrink-0">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-ink-subtle">{(name || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
            aria-label="Foto de perfil"
            className="text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-bold file:text-white" />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
          className="accent-brand w-5 h-5 mt-0.5 shrink-0" />
        <span className="text-sm text-ink-muted">
          He leído y acepto la{" "}
          <Link href="/legal/privacidad" target="_blank" className="text-brand underline">política de privacidad</Link>,
          la{" "}
          <Link href="/legal/cookies" target="_blank" className="text-brand underline">política de cookies</Link>
          {" "}y los{" "}
          <Link href="/legal/terminos" target="_blank" className="text-brand underline">términos y condiciones</Link>.
        </span>
      </label>

      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}

      <button type="submit" disabled={status === "saving" || !accepted}
        className="btn-brand text-base px-8 py-3.5 self-start disabled:opacity-50 disabled:cursor-not-allowed">
        {status === "saving" ? "Guardando…" : "Empezar"}
      </button>
    </form>
  );
}
