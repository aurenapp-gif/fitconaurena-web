"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AnnouncementDelete({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    if (!confirm("¿Borrar este comunicado? Dejará de verse en el área de tus clientas.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/miembros/comunicados?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "No se pudo borrar.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch { alert("Error de conexión."); setBusy(false); }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={busy}
      className="text-xs font-semibold text-[#FF6B6B] hover:underline disabled:opacity-50 shrink-0">
      {busy ? "Borrando…" : "✕ Borrar"}
    </button>
  );
}
