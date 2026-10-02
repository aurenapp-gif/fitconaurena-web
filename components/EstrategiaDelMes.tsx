"use client";

import { useEffect, useRef, useState } from "react";

/* El dictado del navegador no está en los tipos de TypeScript: va por prefijo
   y no todos los navegadores lo traen. Se declara lo justo que se usa. */
type Reconocimiento = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type ConDictado = Window & {
  SpeechRecognition?: new () => Reconocimiento;
  webkitSpeechRecognition?: new () => Reconocimiento;
};

const BLOQUES = [
  { clave: "logros", titulo: "Lo que has conseguido este mes", ayuda: "Lo que ha hecho bien, con nombre y apellidos." },
  { clave: "ajustes", titulo: "Los ajustes de este mes", ayuda: "Qué cambia en comida, entreno o descanso, y por qué." },
  { clave: "foco", titulo: "En lo que quiero que te centres", ayuda: "Una sola cosa. La que más va a mover la aguja." },
] as const;

type Clave = (typeof BLOQUES)[number]["clave"];

/**
 * La estrategia del mes de una clienta: se escribe o se dicta, y sale un PDF
 * para mandárselo por WhatsApp.
 *
 * Los números NO se escriben aquí: los pone el servidor con sus datos reales
 * al generar el PDF. Aquí solo van las palabras de la coach.
 */
export default function EstrategiaDelMes({
  email,
  nombre,
  sugerencias = [],
}: {
  email: string;
  nombre: string;
  /** Lo que ha visto el analizador, para meterlo de un toque en vez de teclearlo. */
  sugerencias?: string[];
}) {
  const [texto, setTexto] = useState<Record<Clave, string>>({ logros: "", ajustes: "", foco: "" });
  const [dictando, setDictando] = useState<Clave | null>(null);
  const [sePuedeDictar, setSePuedeDictar] = useState(false);
  const [estado, setEstado] = useState<"idle" | "generando" | "error">("idle");
  const [msg, setMsg] = useState("");
  const rec = useRef<Reconocimiento | null>(null);
  const destino = useRef<Clave>("logros");

  useEffect(() => {
    const w = window as ConDictado;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    setSePuedeDictar(true);
    const r = new SR();
    r.lang = "es-ES";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (ev) => {
      let nuevo = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) nuevo += ev.results[i][0].transcript;
      }
      if (!nuevo.trim()) return;
      const k = destino.current;
      setTexto((p) => ({ ...p, [k]: (p[k] ? `${p[k]} ` : "") + nuevo.trim() }));
    };
    r.onerror = (ev) => {
      setDictando(null);
      if (ev.error === "not-allowed") setMsg("El navegador no me deja usar el micrófono. Dale permiso y vuelve a probar.");
    };
    r.onend = () => setDictando(null);
    rec.current = r;
    return () => { try { r.stop(); } catch { /* ya estaba parado */ } };
  }, []);

  function alternarDictado(k: Clave) {
    const r = rec.current;
    if (!r) return;
    setMsg("");
    if (dictando === k) { try { r.stop(); } catch { /* da igual */ } setDictando(null); return; }
    if (dictando) { try { r.stop(); } catch { /* da igual */ } }
    destino.current = k;
    try { r.start(); setDictando(k); } catch { setMsg("No he podido arrancar el dictado."); }
  }

  function anadirSugerencia(s: string) {
    setTexto((p) => ({ ...p, ajustes: p.ajustes ? `${p.ajustes}\n${s}` : s }));
  }

  async function generar() {
    if (estado === "generando") return;
    setEstado("generando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/estrategia/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          bloques: BLOQUES.map((b) => ({ titulo: b.titulo, cuerpo: texto[b.clave] })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setEstado("error"); setMsg(d.error ?? "No se pudo generar el PDF."); return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (res.headers.get("Content-Disposition") ?? "").match(/filename="([^"]+)"/)?.[1] ?? "Estrategia.pdf";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setEstado("idle"); setMsg("Descargado. Ya puedes mandárselo por WhatsApp.");
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  const algoEscrito = BLOQUES.some((b) => texto[b.clave].trim() !== "");

  return (
    <div className="flex flex-col gap-4">
      {sugerencias.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">
            Lo que ha visto el analizador · toca para añadirlo a los ajustes
          </p>
          <div className="flex flex-wrap gap-2">
            {sugerencias.map((s, i) => (
              <button key={i} type="button" onClick={() => anadirSugerencia(s)}
                className="text-left text-[13px] px-3 py-2 rounded-xl border border-line text-ink-muted hover:border-brand hover:text-ink max-w-full">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {BLOQUES.map((b) => (
        <div key={b.clave}>
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <label htmlFor={`bloque-${b.clave}`} className="text-sm font-bold text-ink">{b.titulo}</label>
            {sePuedeDictar && (
              <button type="button" onClick={() => alternarDictado(b.clave)}
                aria-pressed={dictando === b.clave}
                className={`text-xs px-3 py-1.5 rounded-full border ${dictando === b.clave ? "bg-warn text-black border-warn" : "border-line text-ink-muted"}`}>
                {dictando === b.clave ? "● Grabando — tocar para parar" : "🎙 Dictar"}
              </button>
            )}
          </div>
          <textarea
            id={`bloque-${b.clave}`}
            value={texto[b.clave]}
            onChange={(e) => setTexto((p) => ({ ...p, [b.clave]: e.target.value }))}
            rows={4}
            placeholder={b.ayuda}
            className="w-full rounded-xl border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
          />
        </div>
      ))}

      {!sePuedeDictar && (
        <p className="text-xs text-ink-subtle">
          Este navegador no deja dictar desde la web. En el móvil tienes el micrófono del propio teclado,
          que funciona igual de bien y escribe directamente en el cuadro.
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={generar} disabled={!algoEscrito || estado === "generando"}
          className="btn-brand text-sm px-5 py-2.5 disabled:opacity-50">
          {estado === "generando" ? "Generando…" : `Generar el PDF de ${nombre}`}
        </button>
        {msg && <span className={`text-sm ${estado === "error" ? "text-warn" : "text-brand"}`}>{msg}</span>}
      </div>
      <p className="text-xs text-ink-subtle">
        Los números del PDF —peso, cintura, pasos, sueño— los pone la app con sus datos reales. Aquí solo van tus palabras.
      </p>
    </div>
  );
}
