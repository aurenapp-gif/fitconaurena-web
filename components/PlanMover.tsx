"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mover un plan a otra clienta. Solo la coach.
 *
 * Pasa que dos clientas se llaman parecido y el plan acaba en la ficha
 * equivocada. La otra salida era borrarlo y volver a subirlo, que pierde la
 * lectura del plan —y hay que pagarla otra vez— y la fecha real de entrega.
 *
 * Se elige de una lista, no se teclea el correo: el fallo que esto arregla
 * nace justo de confundir a dos personas parecidas, y escribir a mano
 * invitaría a repetirlo.
 */
export default function PlanMover({
  id, etiqueta, clientas,
}: {
  id: string;
  etiqueta: string;
  clientas: { email: string; nombre: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState("");
  const [estado, setEstado] = useState<"idle" | "moviendo">("idle");
  const [error, setError] = useState("");

  async function mover() {
    if (!destino || estado === "moviendo") return;
    const quien = clientas.find((c) => c.email === destino)?.nombre ?? destino;
    if (!confirm(`¿Mover «${etiqueta}» a ${quien}?\n\nDejará de verlo esta clienta y pasará a verlo ella.`)) return;
    setEstado("moviendo");
    setError("");
    try {
      const res = await fetch("/api/miembros/clientas/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, member: destino }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "No se pudo mover."); setEstado("idle"); return; }
      if (d.sesiones > 0) {
        alert(`Movido. Ojo: esta clienta ya había empezado ${d.sesiones} ${d.sesiones === 1 ? "entreno" : "entrenos"} con él. Lo que apuntó sigue guardado, pero deja de verlo.`);
      }
      router.refresh();
    } catch {
      setError("Error de conexión.");
      setEstado("idle");
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="text-xs text-ink-muted underline min-h-[32px]">
        Mover a otra clienta
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      <select value={destino} onChange={(e) => setDestino(e.target.value)}
        className="text-xs border border-line rounded-lg px-2 py-1.5 bg-page text-ink max-w-[190px]">
        <option value="">¿A quién?</option>
        {clientas.map((c) => <option key={c.email} value={c.email}>{c.nombre}</option>)}
      </select>
      <button type="button" onClick={mover} disabled={!destino || estado === "moviendo"}
        className="text-xs font-semibold text-brand disabled:opacity-50 min-h-[32px]">
        {estado === "moviendo" ? "Moviendo…" : "Mover"}
      </button>
      <button type="button" onClick={() => { setAbierto(false); setError(""); }}
        className="text-xs text-ink-subtle min-h-[32px]">Cancelar</button>
      {error && <span role="alert" className="text-xs text-danger w-full">{error}</span>}
    </div>
  );
}
