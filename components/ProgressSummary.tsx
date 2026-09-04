/* Resumen de progreso de la clienta: tres cifras, la meta y el antes/ahora.
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
const kg = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Cifra({ value, label, tono = "text-ink", borde = false }: { value: string; label: string; tono?: string; borde?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 py-1 ${borde ? "border-x border-line" : ""}`}>
      <span className={`text-xl font-extrabold tracking-tight tabular-nums ${tono}`}>{value}</span>
      <span className="text-[11.5px] font-bold text-ink-muted tracking-wide">{label}</span>
    </div>
  );
}

export default function ProgressSummary({
  total, streak, firstWeight, lastWeight, weightDelta, goalWeight, firstWaist, lastWaist,
  beforePhoto, afterPhoto, beforeDate, afterDate,
}: Props) {
  if (total === 0) return null;

  const hayPeso = firstWeight != null && lastWeight != null && weightDelta != null;
  // Bajar es azul; subir, tinta. El color no juzga: su objetivo puede ser subir.
  const deltaTxt = weightDelta == null ? "—" : `${weightDelta > 0 ? "+" : weightDelta < 0 ? "−" : ""}${kg(Math.abs(weightDelta))}`;
  const deltaTono = weightDelta != null && weightDelta < 0 ? "text-brand" : "text-ink";

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

  // Variación de cintura (cm). Con una sola revisión no hay nada que comparar.
  const waistDelta = total >= 2 && firstWaist != null && lastWaist != null ? r1(lastWaist - firstWaist) : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="card-dark !px-2 !py-3 !transform-none grid grid-cols-3">
        {hayPeso ? (
          <>
            <Cifra value={kg(firstWeight)} label="peso inicial" />
            <Cifra value={kg(lastWeight)} label="peso actual" borde />
            <Cifra value={deltaTxt} label="kg en total" tono={deltaTono} />
          </>
        ) : (
          <>
            <Cifra value={String(total)} label={total === 1 ? "check-in" : "check-ins"} />
            <Cifra value={String(streak)} label={streak === 1 ? "semana seguida" : "semanas seguidas"} borde />
            <Cifra value="—" label="peso" tono="text-ink-subtle" />
          </>
        )}
      </div>

      {(goal || waistDelta != null || streak >= 2) && (
        <div className="card-dark !p-4 !transform-none flex flex-col gap-3">
          {goal && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs text-ink-muted">
                  {goal.reached ? "Objetivo alcanzado 🏆" : `Te quedan ${kg(goal.remaining)} kg para tu meta de ${goalWeight} kg`}
                </span>
                <span className="text-xs font-bold text-brand">{Math.round(goal.pct)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${goal.pct}%` }} />
              </div>
            </div>
          )}
          {waistDelta != null && (
            <p className="text-xs text-ink-muted">
              Cintura: <span className="text-ink font-semibold">{firstWaist} → {lastWaist} cm</span>{" "}
              <span className={waistDelta < 0 ? "text-brand font-bold" : "text-ink-muted"}>
                ({waistDelta > 0 ? "+" : ""}{waistDelta} cm)
              </span>
            </p>
          )}
          {streak >= 2 && <p className="text-xs font-bold text-brand">{streak} semanas seguidas con check-in</p>}
        </div>
      )}

      {beforePhoto && afterPhoto && beforePhoto !== afterPhoto && (
        <div className="card-dark !p-4 !transform-none">
          <p className="text-[11.5px] font-bold text-ink-muted tracking-wide mb-2.5">Antes y ahora</p>
          <div className="grid grid-cols-2 gap-2">
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforePhoto} alt="Antes" loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover rounded-lg border border-line bg-surface-2" />
              <figcaption className="text-[10px] text-ink-subtle mt-1">Antes{beforeDate ? ` · ${beforeDate}` : ""}</figcaption>
            </figure>
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterPhoto} alt="Ahora" loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover rounded-lg border border-brand/40 bg-surface-2" />
              <figcaption className="text-[10px] text-brand mt-1">Ahora{afterDate ? ` · ${afterDate}` : ""}</figcaption>
            </figure>
          </div>
        </div>
      )}
    </div>
  );
}
