"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_PREGUNTA } from "@/lib/asistente";

type Mensaje = { role: "user" | "assistant"; content: string };

/**
 * La conversación con la asistente del programa.
 *
 * La respuesta se va escribiendo según llega, no de golpe al final: una espera
 * de ocho segundos con un punto parpadeando parece que se ha roto algo.
 */
export default function Asistente({ nombre, sugerencias }: { nombre: string; sugerencias: string[] }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  // Cada trozo que llega baja la vista, para no tener que perseguir el texto.
  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensajes, enviando]);

  async function preguntar(pregunta: string) {
    const limpia = pregunta.trim().slice(0, MAX_PREGUNTA);
    if (!limpia || enviando) return;
    setError("");
    setTexto("");
    const historial: Mensaje[] = [...mensajes, { role: "user", content: limpia }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setEnviando(true);
    try {
      const res = await fetch("/api/miembros/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: historial }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se ha podido responder. Inténtalo en un momento.");
        setMensajes(historial);
        return;
      }
      const lector = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensajes([...historial, { role: "assistant", content: acumulado }]);
      }
      if (!acumulado.trim()) {
        setError("No ha llegado respuesta. Vuelve a intentarlo.");
        setMensajes(historial);
      }
    } catch {
      setError("Error de conexión. Comprueba que tienes cobertura y vuelve a intentarlo.");
      setMensajes(historial);
    } finally {
      setEnviando(false);
      campoRef.current?.focus();
    }
  }

  const vacia = mensajes.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {vacia ? (
        <div className="bg-surface rounded-[14px] p-4">
          <p className="text-[17px] text-ink leading-snug">
            Hola, {nombre}. Pregúntame lo que quieras sobre cómo funciona el programa y te lo resuelvo al momento.
          </p>
          <p className="text-[15px] text-ink-muted mt-1">
            Para lo tuyo en concreto —tu plan, una molestia, cambiar una dosis— te diré que hables con tu coach, porque eso lo decide ella.
          </p>
          {sugerencias.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              {sugerencias.map((s) => (
                <button key={s} type="button" onClick={() => preguntar(s)} disabled={enviando}
                  className="text-left text-[15px] text-brand bg-page rounded-[11px] px-4 py-3 min-h-[44px] disabled:opacity-60">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mensajes.map((m, i) => (
            m.role === "user" ? (
              <div key={i} className="self-end max-w-[85%] bg-brand text-white rounded-[16px] rounded-br-[5px] px-4 py-2.5">
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="self-start max-w-[92%] bg-surface rounded-[16px] rounded-bl-[5px] px-4 py-3">
                {m.content ? (
                  <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <span className="flex gap-1 py-1" aria-label="Escribiendo">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-ink-subtle animate-pulse" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </span>
                )}
              </div>
            )
          ))}
          <div ref={finRef} />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[15px] text-danger px-1">{error}</p>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}
        className="sticky bottom-0 bg-page pt-2 pb-1 flex items-end gap-2"
      >
        <textarea
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía; Mayúsculas+Enter hace un salto de línea.
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); preguntar(texto); }
          }}
          rows={1}
          maxLength={MAX_PREGUNTA}
          placeholder="Escribe tu pregunta…"
          aria-label="Tu pregunta"
          className="flex-1 resize-none rounded-[18px] bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-ink-subtle outline-none focus:ring-2 focus:ring-brand/40 max-h-32"
        />
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"
          className="w-11 h-11 shrink-0 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>

      <p className="text-[13px] text-ink-muted px-1 -mt-1">
        Respuestas automáticas sobre el programa. Para lo que no sepa,{" "}
        <Link href="/miembros/dudas" className="text-brand">deja tu duda</Link> (es anónima) o díselo a tu coach en la llamada.
      </p>
    </div>
  );
}
