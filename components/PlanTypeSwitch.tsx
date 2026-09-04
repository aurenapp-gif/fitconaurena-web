"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OTRO = { nutricion: "entrenamiento", entrenamiento: "nutricion" } as const;
const NOMBRE = { nutricion: "nutrición", entrenamiento: "entrenamiento" } as const;

type Tipo = keyof typeof OTRO;

/**
 * Corrige el tipo de un plan mal clasificado, sin volver a subirlo.
 *
 * Equivocarse en el desplegable al subir es fácil, y hasta ahora la única
 * salida era borrarlo y subirlo otra vez —lo que le mandaba a la clienta un
 * segundo «tu plan ya está listo» por un archivo que ya tenía—. Aquí solo
 * cambia la etiqueta: el documento no se mueve y ella no se entera de nada.
 */
export default function PlanTypeSwitch({ id, type }: { id: string; type: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  // Un plan con un tipo raro (de una versión antigua) no se toca desde aquí.
  if (type !== "nutricion" && type !== "entrenamiento") return null;
  const destino = OTRO[type as Tipo];

  async function cambiar() {
    if (enviando) return;
    if (!confirm(`¿Pasar este plan a ${NOMBRE[destino]}? La clienta no recibe ningún aviso: el documento es el mismo.`)) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/miembros/clientas/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type: destino }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "No se pudo cambiar el tipo.");
        return;
      }
      router.refresh();
    } catch {
      alert("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      disabled={enviando}
      title={`Está guardado como ${NOMBRE[type as Tipo]}. Pásalo a ${NOMBRE[destino]}.`}
      className="text-ink-muted hover:text-brand text-xs disabled:opacity-60"
    >
      {enviando ? "…" : `→ ${NOMBRE[destino]}`}
    </button>
  );
}
