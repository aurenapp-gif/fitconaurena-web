"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * «Ver la app como ella», desde su ficha. Solo la coach.
 *
 * Para entender lo que cuenta cuando algo no le funciona: lo que falla casi
 * nunca se ve desde la ficha, se ve desde su pantalla.
 */
export default function VerComo({ email, nombre }: { email: string; nombre: string }) {
  const router = useRouter();
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState("");

  async function entrar() {
    if (yendo) return;
    setYendo(true);
    setError("");
    try {
      const res = await fetch("/api/miembros/ver-como", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se ha podido.");
        setYendo(false);
        return;
      }
      router.push("/miembros");
    } catch {
      setError("Error de conexión.");
      setYendo(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={entrar} disabled={yendo}
        className="min-h-[40px] inline-flex items-center text-brand text-sm font-semibold disabled:opacity-60">
        {yendo ? "Un momento…" : `Ver la app como ${nombre}`}
      </button>
      {error && <p role="alert" className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
