"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * «No se pudieron sacar los ejercicios · Volver a intentarlo».
 *
 * La lectura de un plan se intenta una vez y, si falla, queda marcada para no
 * repetirla en cada visita. El efecto secundario era que un fallo de una tarde
 * condenaba el plan: la clienta veía «no he podido sacar los ejercicios» para
 * siempre y la coach no se enteraba. Aquí se ve y se arregla.
 */
export default function PlanReleer({ id }: { id: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "leyendo">("idle");
  const [msg, setMsg] = useState("");
  const [mal, setMal] = useState(false);

  async function releer() {
    if (estado === "leyendo") return;
    setEstado("leyendo"); setMsg(""); setMal(false);
    try {
      const res = await fetch("/api/miembros/clientas/plan/releer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMal(true); setMsg(d.error ?? "No se pudo."); return; }
      setMal(!d.leido);
      setMsg(d.mensaje ?? "");
      if (d.leido) router.refresh();
    } catch { setMal(true); setMsg("Error de conexión."); }
    finally { setEstado("idle"); }
  }

  return (
    <div className="border-t border-line mt-1.5 pt-1.5 flex items-center justify-between gap-3 flex-wrap">
      <span className={`text-xs ${mal ? "text-warn" : "text-ink-muted"}`}>
        {msg || "No se pudieron sacar los ejercicios de este PDF: ella no puede apuntar pesos con él."}
      </span>
      <button type="button" onClick={releer} disabled={estado === "leyendo"}
        className="text-xs text-brand font-semibold min-h-[36px] px-2 disabled:opacity-50">
        {estado === "leyendo" ? "Leyendo…" : "Volver a intentarlo"}
      </button>
    </div>
  );
}
