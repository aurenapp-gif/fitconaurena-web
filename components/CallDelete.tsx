"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Borra una llamada estratégica ya publicada (solo coach). Pide confirmación
 * porque la clienta deja de verla al instante. */
export default function CallDelete({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    if (!confirm("¿Borrar esta llamada? La clienta dejará de verla. No se puede deshacer.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/miembros/clientas/llamadas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "No se pudo borrar.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Error de conexión.");
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={busy}
      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50 shrink-0">
      {busy ? "Borrando…" : "✕ Borrar"}
    </button>
  );
}
