"use client";

import { useState } from "react";

export default function RemoveClient({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function remove() {
    if (busy) return;
    if (!confirm(`¿Eliminar a ${email}? Perderá el acceso al área de miembros.`)) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/miembros/clientas/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "No se pudo eliminar.");
        setBusy(false);
        return;
      }
      window.location.href = "/miembros/clientas";
    } catch {
      setErr("Error de conexión.");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={remove} disabled={busy}
        className="text-sm font-semibold rounded-xl border border-danger/40 text-danger px-5 py-2.5 hover:bg-danger/10 transition-colors disabled:opacity-60">
        {busy ? "Eliminando…" : "Eliminar clienta (quitar acceso)"}
      </button>
      {err && <span className="text-sm text-danger">{err}</span>}
    </div>
  );
}
