"use client";

import { useState } from "react";

/** El botón de «ya la he hecho», dentro de la comida. */
export default function MarcarComida({ nombre, hecha }: { nombre: string; hecha: boolean }) {
  const [marcada, setMarcada] = useState(hecha);
  const [error, setError] = useState("");

  async function alternar() {
    const nueva = !marcada;
    setMarcada(nueva);
    setError("");
    try {
      const res = await fetch("/api/miembros/comidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comida: nombre, hecha: nueva }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMarcada(!nueva);
      setError("No se ha podido guardar. Inténtalo otra vez.");
    }
  }

  return (
    <>
      <button type="button" onClick={alternar} aria-pressed={marcada}
        className={`w-full rounded-[14px] py-4 text-[17px] font-semibold flex items-center justify-center gap-2 ${
          marcada ? "bg-success-soft text-success" : "bg-surface text-ink"}`}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
        {marcada ? "Hecha" : "Marcar como hecha"}
      </button>
      {error && <p role="alert" className="text-[13px] text-danger px-1">{error}</p>}
    </>
  );
}
