/* Tarjeta de progreso de la clienta: stats + comparativa antes/ahora.
 * Componente presentacional (sin estado): recibe ya los datos calculados. */

type Props = {
  total: number;
  streak: number;
  firstWeight: number | null;
  lastWeight: number | null;
  weightDelta: number | null;
  beforePhoto?: string;
  afterPhoto?: string;
  beforeDate?: string;
  afterDate?: string;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-3 py-4 rounded-xl bg-[#141414] border border-[#252525]">
      <div className="text-2xl font-extrabold text-[#CAFF00] leading-none">{value}</div>
      <div className="text-xs text-[#A0A0A0] mt-1.5">{label}</div>
    </div>
  );
}

export default function ProgressSummary({
  total, streak, firstWeight, lastWeight, weightDelta, beforePhoto, afterPhoto, beforeDate, afterDate,
}: Props) {
  if (total === 0) return null;

  const deltaTxt =
    weightDelta == null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta} kg`;
  const deltaColor =
    weightDelta == null ? "text-[#A0A0A0]" : weightDelta < 0 ? "text-[#CAFF00]" : "text-white";

  return (
    <div className="card-dark p-6 !transform-none mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h3 className="font-bold text-white">Tu progreso</h3>
        {streak >= 2 && (
          <span className="text-xs font-bold text-[#CAFF00] bg-[#CAFF00]/10 border border-[#CAFF00]/30 rounded-full px-3 py-1">
            🔥 {streak} semanas seguidas
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <Stat value={String(total)} label={total === 1 ? "check-in" : "check-ins"} />
        <Stat value={`${streak}`} label={streak === 1 ? "semana seguida" : "semanas seguidas"} />
        <div className="text-center px-3 py-4 rounded-xl bg-[#141414] border border-[#252525]">
          <div className={`text-2xl font-extrabold leading-none ${deltaColor}`}>{deltaTxt}</div>
          <div className="text-xs text-[#A0A0A0] mt-1.5">
            {firstWeight != null && lastWeight != null ? `${firstWeight} → ${lastWeight} kg` : "cambio de peso"}
          </div>
        </div>
      </div>

      {beforePhoto && afterPhoto && beforePhoto !== afterPhoto && (
        <div className="mt-5">
          <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-3">Antes / Ahora</p>
          <div className="grid grid-cols-2 gap-3">
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforePhoto} alt="Antes" loading="lazy" decoding="async" className="w-full h-56 object-cover rounded-lg border border-[#252525]" />
              <figcaption className="text-[10px] text-[#666666] mt-1">Antes{beforeDate ? ` · ${beforeDate}` : ""}</figcaption>
            </figure>
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterPhoto} alt="Ahora" loading="lazy" decoding="async" className="w-full h-56 object-cover rounded-lg border border-[#CAFF00]/40" />
              <figcaption className="text-[10px] text-[#CAFF00] mt-1">Ahora{afterDate ? ` · ${afterDate}` : ""}</figcaption>
            </figure>
          </div>
        </div>
      )}
    </div>
  );
}
