"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * El enlace de la sala de la videollamada, editable desde el Panel de la
 * coach. Es el que abre el botón «Entrar» de las clientas y el que va en el
 * recordatorio del día de la llamada.
 */
export default function CallUrlSetter({ initial }: { initial: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial);
  const [estado, setEstado] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (estado === "loading") return;
    setEstado("loading"); setMsg("");
    try {
      const res = await fetch("/api/miembros/admin/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_url: url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo guardar."); return; }
      setEstado("saved"); setMsg("Guardado. Ya lo ven las clientas.");
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-2">
      <label className="block text-xs text-ink-muted">Enlace de la sala (Zoom, Meet…)</label>
      <div className="flex gap-2 flex-wrap">
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://us06web.zoom.us/j/…" aria-label="Enlace de la sala de la videollamada"
          className="rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand flex-1 min-w-[240px]" />
        <button type="submit" disabled={estado === "loading"} className="btn-brand text-sm px-5 py-3 disabled:opacity-60">
          {estado === "loading" ? "…" : "Guardar"}
        </button>
      </div>
      {msg && <p className={`text-sm ${estado === "error" ? "text-danger" : "text-brand"}`}>{msg}</p>}
      <p className="text-xs text-ink-subtle">Es el enlace que abre el botón «Entrar» de las clientas y el que va en el recordatorio del día de la llamada. Pega el «Únase a la reunión» de Zoom, con la contraseña incluida.</p>
    </form>
  );
}
