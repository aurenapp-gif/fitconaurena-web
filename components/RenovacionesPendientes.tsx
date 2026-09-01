import Link from "next/link";
import { fechaCorta, type Renovacion } from "@/lib/renovaciones";

export type FilaRenovacion = {
  email: string;
  nombre: string;
  alimentacion: Renovacion;
  entrenamiento: Renovacion;
};

function Pastilla({ r, icono }: { r: Renovacion; icono: string }) {
  if (r.urgencia === "ok" || r.urgencia === "pronto") return null;
  const rojo = r.urgencia === "vencida" || r.urgencia === "sin-plan";
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
        rojo ? "bg-[#FF6B6B] text-white" : "bg-[#FFB800] text-black"
      }`}
      title={r.toca ? `Toca el ${fechaCorta(r.toca)}` : "Nunca le has subido uno"}
    >
      {icono} {r.urgencia === "sin-plan" ? "sin plan" : r.texto.toLowerCase()}
    </span>
  );
}

/**
 * Quién tiene la planificación por cambiar, de lo más urgente a lo menos.
 *
 * Con dos docenas de clientas, entrar ficha por ficha para ver a quién le toca
 * no es viable: lo que hace falta es la lista del día. Solo salen las que
 * requieren acción —vencidas, de hoy o sin plan—; las que van al día no
 * aparecen, porque una lista donde está todo el mundo no se mira.
 */
export default function RenovacionesPendientes({ filas }: { filas: FilaRenovacion[] }) {
  if (filas.length === 0) {
    return (
      <div className="card-dark p-5 !transform-none mb-6">
        <h2 className="font-bold text-white mb-1">Planificaciones por cambiar</h2>
        <p className="text-sm text-[#1CA0E3]">Ninguna pendiente ✓</p>
      </div>
    );
  }

  return (
    <div className="card-dark p-5 !transform-none mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="font-bold text-white">Planificaciones por cambiar</h2>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40">
          {filas.length} {filas.length === 1 ? "clienta" : "clientas"}
        </span>
      </div>
      <p className="text-xs text-[#666666] mb-4">
        🥗 alimentación cada día 1 · 🏋️ entrenamiento cada 12 semanas. Las recién subidas no salen: se saltan al mes siguiente.
      </p>
      <div className="flex flex-col gap-2">
        {filas.map((f) => (
          <Link
            key={f.email}
            href={`/miembros/clientas/${encodeURIComponent(f.email)}`}
            className="rounded-lg border border-[#252525] bg-[#0A0A0A] px-4 py-2.5 hover:border-[#1CA0E3] transition-colors"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-white truncate">{f.nombre}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <Pastilla r={f.alimentacion} icono="🥗" />
                <Pastilla r={f.entrenamiento} icono="🏋️" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
