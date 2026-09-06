"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Interruptor «Mostrar mi peso» de los ajustes. Al estilo de iOS. */
export default function PesoToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [oculto, setOculto] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function cambiar() {
    if (busy) return;
    const next = !oculto;
    setOculto(next);
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/miembros/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hide_weight: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setOculto(!next);
      setErr("No se pudo guardar. Prueba otra vez.");
    } finally {
      setBusy(false);
    }
  }

  const mostrar = !oculto;
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 min-h-[46px] px-4 py-2 text-[17px] text-ink">
        <span className="min-w-0"><span className="block">Mostrar mi peso</span><span className="block text-[13px] text-ink-muted">Tu coach lo ve igual; esto es solo para ti.</span></span>
        <button type="button" role="switch" aria-checked={mostrar} aria-label="Mostrar mi peso" onClick={cambiar} disabled={busy}
          className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${mostrar ? "bg-success" : "bg-line-strong"}`}>
          <span className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-all ${mostrar ? "left-[22px]" : "left-[2px]"}`} />
        </button>
      </div>
      {err && <p className="px-4 pb-2 text-sm text-danger">{err}</p>}
    </div>
  );
}
