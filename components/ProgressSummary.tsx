/* Tarjeta de progreso de la clienta: stats + comparativa antes/ahora.
 * Componente presentacional (sin estado): recibe ya los datos calculados. */

type Props = {
  total: number;
  streak: number;
  firstWeight: number | null;
  lastWeight: number | null;
  weightDelta: number | null;
  goalWeight?: number | null;
  firstWaist?: number | null;
  lastWaist?: number | null;
  beforePhoto?: string;
  afterPhoto?: string;
  beforeDate?: string;
  afterDate?: string;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-3 py-4 rounded-xl bg-[#141414] border border-[#252525]">
      <div className="text-2xl font-extrabold text-[#CAFF00] leading-none">{value}</div>
      <div className="text-xs text-[#A0A0A0] mt-1.5">{label}</div>
    </div>
  );
}

export default function ProgressSummary({
  total, streak, firstWeight, lastWeight, weightDelta, goalWeight, firstWaist, lastWaist,
  beforePhoto, afterPhoto, beforeDate, afterDate,
}: Props) {
  if (total === 0) return null;

  const deltaTxt =
    weightDelta == null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta} kg`;
  const deltaColor =
    weightDelta == null ? "text-[#A0A0A0]" : weightDelta < 0 ? "text-[#CAFF00]" : "text-white";

  // Barra de progreso hacia el objetivo de peso.
  let goal: null | { pct: number; reached: boolean; remaining: number } = null;
  if (firstWeight != null && lastWeight != null && goalWeight != null && goalWeight !== firstWeight) {
    const lossGoal = goalWeight <= firstWeight;
    const total2 = Math.abs(goalWeight - firstWeight);
    const done = lossGoal ? firstWeight - lastWeight : lastWeight - firstWeight;
    const pct = Math.max(0, Math.min(100, total2 > 0 ? (done / total2) * 100 : 0));
    const reached = lossGoal ? lastWeight <= goalWeight : lastWeight >= goalWeight;
    goal = { pct, reached, remaining: r1(Math.abs(goalWeight - lastWeight)) };
  }

  // Variación de cintura (cm).
  const waistDelta = firstWaist != null && lastWaist != null ? r1(lastWaist - firstWaist) : null;

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

      {goal && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-[#A0A0A0]">
              {goal.reached ? "¡Objetivo alcanzado! 🏆" : `Te quedan ${goal.remaining} kg para tu meta de ${goalWeight} kg`}
            </span>
            <span className="text-xs font-bold text-[#CAFF00]">{Math.round(goal.pct)}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#1c1c1c] overflow-hidden">
            <div className="h-full rounded-full bg-[#CAFF00] transition-all duration-500" style={{ width: `${goal.pct}%` }} />
          </div>
        </div>
      )}

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

      {waistDelta != null && (
        <p className="text-xs text-[#A0A0A0] mt-2">
          Cintura: <span className="text-white font-semibold">{firstWaist} → {lastWaist} cm</span>{" "}
          <span className={waistDelta < 0 ? "text-[#CAFF00] font-bold" : "text-[#A0A0A0]"}>
            ({waistDelta > 0 ? "+" : ""}{waistDelta} cm)
          </span>
        </p>
      )}

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
