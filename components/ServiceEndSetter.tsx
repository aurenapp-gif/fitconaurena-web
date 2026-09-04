"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SERVICE_MONTHS, serviceEndISO } from "@/lib/profile";

/**
 * Vencimiento del servicio contratado. Se pone solo al dar de alta (doce
 * meses); esto es para corregirlo cuando hay otra duración pactada y para
 * ponérselo a las clientas que ya estaban antes.
 */
export default function ServiceEndSetter({ member, current }: { member: string; current?: string }) {
  const router = useRouter();
  const [date, setDate] = useState(current ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function save(value: string) {
    if (status === "loading") return;
    setStatus("loading"); setMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/vencimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, date: value }),
      });
      if (res.ok) { setStatus("saved"); router.refresh(); return; }
      const d = await res.json().catch(() => ({}));
      setStatus("error");
      setMsg(d.setup ? "Falta ejecutar el SQL en Supabase." : d.error ?? "No se pudo guardar.");
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  // Doce meses contados desde hoy: el atajo para las clientas antiguas.
  function desdeHoy() {
    const d = serviceEndISO();
    setDate(d);
    save(d);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="block text-xs text-ink-muted mb-1">Fin del servicio contratado</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-line bg-page px-4 py-2.5 text-sm text-ink outline-none focus:border-brand" />
        </div>
        <button onClick={() => save(date)} disabled={status === "loading"} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">
          {status === "loading" ? "…" : "Guardar"}
        </button>
        {!current && (
          <button type="button" onClick={desdeHoy} disabled={status === "loading"} className="btn-outline text-sm px-4 py-2.5 disabled:opacity-60">
            {SERVICE_MONTHS} meses desde hoy
          </button>
        )}
        {status === "saved" && <span className="text-sm text-brand">✓</span>}
      </div>
      {msg && <span className="text-sm text-danger">{msg}</span>}
    </div>
  );
}
