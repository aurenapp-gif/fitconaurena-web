"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image";
import { MAX_NOTA, type Herramienta as Def } from "@/lib/herramientas";

/**
 * Una herramienta: una foto, una nota corta y una respuesta.
 *
 * La foto se reduce en el móvil antes de salir, igual que las de la revisión:
 * una foto de una carta de restaurante sale de ocho megas y por una conexión
 * de bar no sube nunca.
 */
export default function Herramienta({ def }: { def: Def }) {
  const [foto, setFoto] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);

  function elegir(f: File | null) {
    setError("");
    setRespuesta("");
    setFoto(f);
    setVista((v) => { if (v) URL.revokeObjectURL(v); return f ? URL.createObjectURL(f) : null; });
  }

  async function enviar() {
    if (!foto || enviando) return;
    setEnviando(true);
    setError("");
    setRespuesta("");
    try {
      const fd = new FormData();
      fd.append("herramienta", def.id);
      fd.append("foto", await resizeImage(foto));
      fd.append("nota", nota);
      const res = await fetch("/api/miembros/herramientas", { method: "POST", body: fd });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se ha podido. Inténtalo en un momento.");
        return;
      }
      const lector = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setRespuesta(acc);
      }
    } catch {
      setError("Error de conexión. Comprueba que tienes cobertura y vuelve a intentarlo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/miembros/herramientas" className="text-[16px] text-brand">‹ Herramientas</Link>
      <div>
        <h1 className="page-title mb-1">{def.icon} {def.name}</h1>
        <p className="text-[15px] text-ink-muted">{def.pide}</p>
      </div>

      <div className="bg-surface rounded-[14px] p-4 flex flex-col gap-3">
        <label className="block">
          <span className="sr-only">Elegir foto</span>
          <input
            ref={campoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            className="block w-full text-[15px] text-ink-muted file:mr-3 file:rounded-[11px] file:border-0 file:bg-brand file:px-4 file:py-2.5 file:text-white file:text-[15px] file:font-semibold"
          />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {vista && <img src={vista} alt="La foto que vas a mandar" className="w-full max-h-72 object-contain rounded-[11px] bg-page" />}

        <label className="block">
          <span className="block text-[13px] text-ink-muted mb-1">Algo que deba saber (opcional)</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={MAX_NOTA}
            placeholder={def.ejemplo}
            className="w-full rounded-[11px] bg-page px-4 py-3 text-[16px] text-ink placeholder:text-ink-subtle outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>

        <button type="button" onClick={enviar} disabled={!foto || enviando}
          className="btn-brand w-full py-4 text-[17px] disabled:opacity-50">
          {enviando ? "Mirándola…" : "Mandársela a FitAI"}
        </button>
      </div>

      {error && <p role="alert" className="text-[15px] text-danger px-1">{error}</p>}

      {(respuesta || enviando) && (
        <div className="bg-surface rounded-[14px] p-4">
          {respuesta ? (
            <p className="text-[16px] leading-relaxed text-ink whitespace-pre-wrap">{respuesta}</p>
          ) : (
            <span className="flex gap-1 py-1" aria-label="Mirando la foto">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-ink-subtle animate-pulse" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
          )}
        </div>
      )}

      <p className="text-[13px] text-ink-muted px-1">
        Te ayuda con el plan que ya tienes; no lo cambia. Para cambiar algo, díselo a tu coach.
      </p>
    </div>
  );
}
