"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Borra un plan ya subido (solo coach). Pide confirmación porque la clienta
 * deja de verlo al instante y el archivo se elimina del almacenamiento. */
export default function PlanDelete({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    if (!confirm(`¿Borrar el plan de ${label}? La clienta dejará de verlo. No se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/miembros/clientas/plan?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
      className="min-h-[40px] inline-flex items-center text-xs font-semibold text-danger hover:underline disabled:opacity-50 shrink-0">
      {busy ? "Borrando…" : "✕ Borrar"}
    </button>
  );
}
