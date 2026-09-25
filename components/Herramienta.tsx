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
  /** Lo que ha contestado a las preguntas de arriba. Clave → opción elegida. */
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
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
      fd.append("respuestas", JSON.stringify(respuestas));
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

  /** Preguntas sin contestar. El botón espera a que sean cero. */
  const faltan = def.preguntas.filter((p) => !respuestas[p.clave]).length;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/miembros/herramientas" className="text-[16px] text-brand">‹ Herramientas</Link>
      <div>
        <h1 className="page-title mb-1">{def.icon} {def.name}</h1>
        <p className="text-[15px] text-ink-muted">{def.pide}</p>
      </div>

      <div className="bg-surface rounded-[14px] p-4 flex flex-col gap-3">
        {/*
          El botón es nuestro y el campo va escondido detrás. El campo de
          verdad lo pinta el navegador con las palabras de su idioma —en un
          móvil en inglés ponía «Choose File · No file chosen»—, y aquí no se
          habla inglés.
        */}
        <label className="block cursor-pointer">
          <span className="block w-full rounded-[11px] bg-brand-soft text-brand text-[16px] font-semibold text-center py-3.5">
            {foto ? "Elegir otra foto" : "Hacer o elegir una foto"}
          </span>
          <input
            ref={campoRef}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label={foto ? "Elegir otra foto" : "Hacer o elegir una foto"}
            onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {vista && <img src={vista} alt="La foto que vas a mandar" className="w-full max-h-72 object-contain rounded-[11px] bg-page" />}

        {/*
          Cuatro toques antes de mandar la foto.

          De una foto sola sale media respuesta: da igual lo buena que sea la
          foto de una nevera si no se sabe para cuántos es ni cuánto rato hay.
          Van en botones y no en casillas de escribir a propósito: esto se usa
          de pie, con una mano.
        */}
        {def.preguntas.map((p) => (
          <div key={p.clave} className="flex flex-col gap-1.5">
            <span className="text-[13px] text-ink-muted">{p.etiqueta}</span>
            <div className="flex flex-wrap gap-2">
              {p.opciones.map((o) => {
                const elegida = respuestas[p.clave] === o;
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={elegida}
                    onClick={() => setRespuestas((r) => ({ ...r, [p.clave]: o }))}
                    className={`rounded-full px-3.5 py-2 text-[15px] min-h-[40px] transition-colors ${
                      elegida
                        ? "bg-brand text-white font-semibold"
                        : "bg-page text-ink-muted hover:text-ink"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <label className="block">
          <span className="block text-[13px] text-ink-muted mb-1">{def.notaEtiqueta}</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={MAX_NOTA}
            placeholder={def.ejemplo}
            className="w-full rounded-[11px] bg-page px-4 py-3 text-[16px] text-ink placeholder:text-ink-subtle outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>

        <button type="button" onClick={enviar} disabled={!foto || enviando || faltan > 0}
          className="btn-brand w-full py-4 text-[17px] disabled:opacity-50">
          {enviando ? "Mirándola…" : "Mandársela a FitAI"}
        </button>
        {/* Por qué está apagado el botón. Sin esto se queda mirándolo. */}
        {!enviando && (faltan > 0 || !foto) && (
          <p className="text-[13px] text-ink-muted text-center -mt-1">
            {!foto && faltan > 0
              ? "Haz la foto y contesta lo de arriba."
              : !foto
                ? "Solo falta la foto."
                : faltan === 1
                  ? "Falta una respuesta de arriba."
                  : `Faltan ${faltan} respuestas de arriba.`}
          </p>
        )}
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
