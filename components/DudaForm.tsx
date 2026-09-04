"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES } from "@/lib/dudas";

/**
 * Deja una duda en el buzón anónimo.
 *
 * El texto de pantalla es la mitad del trabajo: si no queda clarísimo que no se
 * guarda quién escribe, nadie cuenta lo que de verdad le pasa, que es justo
 * para lo que existe esto.
 */
export default function DudaForm() {
  const router = useRouter();
  const [cat, setCat] = useState<string>("entrenamiento");
  const [body, setBody] = useState("");
  const [privada, setPrivada] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "done">("idle");
  const [msg, setMsg] = useState("");

  const selected = CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (body.trim().length < 10) {
      setStatus("error");
      setMsg("Cuéntame un poco más, así podré ayudarte mejor.");
      return;
    }

    setStatus("sending"); setMsg("");
    try {
      const res = await fetch("/api/miembros/dudas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: cat, body, privada }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(d.setup ? "Falta un paso de configuración. Avisa a tu coach." : d.error ?? "No se pudo enviar.");
        return;
      }
      setBody(""); setPrivada(false); setStatus("done");
      setMsg(
        d.privada
          ? "Enviada. Tu coach te responderá en privado a tu correo."
          : "Enviada de forma anónima. Cuando tu coach la responda, aparecerá aquí abajo."
      );
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("Error de conexión. Inténtalo otra vez.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-ink-muted mb-2">¿Sobre qué es?</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                cat === c.id
                  ? "bg-brand text-white"
                  : "border border-line text-ink-muted hover:text-ink"
              }`}
            >
              <span aria-hidden="true">{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="duda-body" className="block text-xs font-bold text-ink-muted mb-2">
          Tu duda o tu problema
        </label>
        <textarea
          id="duda-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder={selected.example ? `Por ejemplo: ${selected.example}` : "Cuéntame qué te pasa…"}
          className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
        />
        <p className="text-xs text-ink-subtle mt-1.5">
          Escríbelo con tus palabras, sin filtrar. Cuanto más real, mejor te podrá ayudar.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-line bg-page px-4 py-3">
        <input
          type="checkbox"
          checked={privada}
          onChange={(e) => setPrivada(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand shrink-0"
        />
        <span className="text-sm text-ink-muted">
          <strong className="text-ink">Prefiero que me respondas solo a mí.</strong>{" "}
          Si marcas esto, tu coach verá tu correo y te contestará en privado. Tu duda no se
          publicará ni la verá nadie más.
        </span>
      </label>

      {msg && (
        <p className={`text-sm ${status === "error" ? "text-danger" : "text-success"}`}>{msg}</p>
      )}

      <button type="submit" disabled={status === "sending"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "sending" ? "Enviando…" : privada ? "Enviar en privado" : "Enviar sin dar mi nombre"}
      </button>
    </form>
  );
}
