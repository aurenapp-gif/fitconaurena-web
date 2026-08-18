"use client";

import { useState } from "react";

/**
 * "A mí también me pasa".
 *
 * Sirve para dos cosas: la coach ve qué duda le interesa a más gente y prioriza
 * la respuesta o el vídeo; y quien la escribió comprueba que no es la única a
 * la que le pasa, que muchas veces alivia más que la propia respuesta.
 *
 * Se actualiza al instante y se corrige si el servidor dice otra cosa: un
 * "me gusta" no merece una espera.
 */
export default function DudaLike({ id, likes, mine }: { id: string; likes: number; mine: boolean }) {
  const [count, setCount] = useState(likes);
  const [on, setOn] = useState(mine);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setOn(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      const res = await fetch("/api/miembros/dudas/voto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, on: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "error");
      if (typeof d.likes === "number") setCount(d.likes);
    } catch {
      // Deshacemos el cambio optimista si no se pudo guardar.
      setOn(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Ya has dicho que a ti también te pasa" : "A mí también me pasa"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        on
          ? "border-[#1CA0E3] bg-[#1CA0E3]/10 text-[#1CA0E3]"
          : "border-[#252525] text-[#A0A0A0] hover:text-white"
      }`}
    >
      <span aria-hidden="true">{on ? "💙" : "🤍"}</span>
      <span>A mí también</span>
      {count > 0 && <span className="tabular-nums">· {count}</span>}
    </button>
  );
}
