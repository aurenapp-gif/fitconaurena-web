"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * «Que entre sin nada»: ni bienvenida, ni contrato, ni espera.
 *
 * Para invitadas y pruebas. Avisa de lo que se salta antes de hacerlo: la
 * bienvenida es donde acepta las condiciones y deja sus datos, así que quien
 * entre por aquí entra sin haberlas aceptado.
 */
export default function AccesoDirecto({
  email, nombre, yaEntra,
}: {
  email: string;
  nombre: string;
  /** Si ya pasó la bienvenida (o se le concedió esto antes). */
  yaEntra: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function conceder() {
    if (ocupado) return;
    if (!confirm(
      `¿Dejar entrar a ${nombre} sin nada?\n\n` +
      `No se le pedirá la bienvenida (nombre completo, dirección y aceptar las condiciones) ` +
      `ni ningún contrato.\n\nEntrará SIN haber aceptado las condiciones.`
    )) return;
    setOcupado(true);
    setError("");
    try {
      const res = await fetch("/api/miembros/clientas/acceso-directo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, directo: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo.");
        setOcupado(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión.");
      setOcupado(false);
    }
  }

  if (yaEntra) {
    return <p className="text-xs text-ink-subtle mt-1.5">Entra directa, sin bienvenida ni contrato.</p>;
  }

  return (
    <div className="mt-1.5">
      <button type="button" onClick={conceder} disabled={ocupado}
        className="text-xs text-ink-muted underline min-h-[32px] disabled:opacity-60">
        {ocupado ? "Un momento…" : "Dejar que entre sin nada (invitada)"}
      </button>
      {error && <p role="alert" className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
