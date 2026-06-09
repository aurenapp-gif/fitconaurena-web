"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteContentButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    if (!confirm(`¿Borrar "${title}"? El vídeo/archivo se elimina y no se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/miembros/contenido", {
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
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-xs font-semibold text-[#FF6B6B] hover:underline disabled:opacity-50 self-start mt-3"
    >
      {busy ? "Borrando…" : "✕ Borrar"}
    </button>
  );
}
