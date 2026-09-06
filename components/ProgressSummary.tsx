import Link from "next/link";
import { Fila, Grupo, Privado } from "@/components/Grupo";

/*
 * Lo que va cambiando: tres cifras que no son la báscula (revisiones
 * seguidas, cintura y sueño), la gráfica de cintura, y el peso en una fila
 * aparte que ella puede ocultar. Presentacional: recibe los datos calculados.
 */

type Props = {
  total: number;
  /** Revisiones seguidas (una por quincena). */
  seguidas: number;
  firstWeight: number | null;
  lastWeight: number | null;
  weightDelta: number | null;
  goalWeight?: number | null;
  firstWaist?: number | null;
  lastWaist?: number | null;
  /** Horas de sueño de media en los últimos 30 días, si las ha apuntado. */
  sueno?: number | null;
  /** Puntos de cintura (fecha corta, cm) para la gráfica. */
  cinturas?: { date: string; value: number }[];
  ocultarPeso?: boolean;
  beforePhoto?: string;
  afterPhoto?: string;
  beforeDate?: string;
  afterDate?: string;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const kg = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Cifra({ value, label, tono = "text-ink" }: { value: string; label: string; tono?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 flex-1 min-w-0">
      <span className={`text-[22px] font-semibold tracking-tight tabular-nums ${tono}`}>{value}</span>
      <span className="text-[13px] text-ink-muted text-center leading-4">{label}</span>
    </div>
  );
}

/** Gráfica de línea pequeña (SVG puro). */
function Linea({ puntos }: { puntos: { date: string; value: number }[] }) {
  if (puntos.length < 2) return null;
  const W = 326, H = 72, pad = 6;
  const ys = puntos.map((p) => p.value);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const x = (i: number) => pad + (i / (puntos.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const d = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const last = puntos[puntos.length - 1];
  return (
    <div className="px-4 py-3">
      <div className="flex justify-between text-[13px] text-ink-muted mb-1.5"><span>Cintura</span><span>{puntos[0].value} → {last.value} cm</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Evolución de la cintura" className="block">
        <path d={`${d} L ${x(puntos.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`} fill="rgb(var(--c-success))" fillOpacity="0.10" />
        <path d={d} fill="none" stroke="rgb(var(--c-success))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(puntos.length - 1)} cy={y(last.value)} r="4" fill="#fff" stroke="rgb(var(--c-success))" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[13px] text-ink-subtle"><span>{puntos[0].date}</span><span>{last.date}</span></div>
    </div>
  );
}

export default function ProgressSummary({
  total, seguidas, firstWeight, lastWeight, weightDelta, goalWeight, firstWaist, lastWaist, sueno, cinturas = [], ocultarPeso = false,
  beforePhoto, afterPhoto, beforeDate, afterDate,
}: Props) {
  if (total === 0) return null;

  const waistDelta = total >= 2 && firstWaist != null && lastWaist != null ? r1(lastWaist - firstWaist) : null;
  const hayPeso = !ocultarPeso && firstWeight != null && lastWeight != null && weightDelta != null;
  const deltaTxt = weightDelta == null ? "" : ` · ${weightDelta > 0 ? "+" : weightDelta < 0 ? "−" : ""}${kg(Math.abs(weightDelta))}`;

  // Meta de peso: solo si ella quiere ver el peso.
  let meta: null | { pct: number; reached: boolean; remaining: number } = null;
  if (hayPeso && goalWeight != null && goalWeight !== firstWeight) {
    const lossGoal = goalWeight <= firstWeight;
    const total2 = Math.abs(goalWeight - firstWeight);
    const done = lossGoal ? firstWeight - lastWeight : lastWeight - firstWeight;
    const pct = Math.max(0, Math.min(100, total2 > 0 ? (done / total2) * 100 : 0));
    meta = { pct, reached: lossGoal ? lastWeight <= goalWeight : lastWeight >= goalWeight, remaining: r1(Math.abs(goalWeight - lastWeight)) };
  }

  return (
    <div className="flex flex-col gap-5">
      <Grupo label="Lo que va cambiando" foot={ocultarPeso ? "Has elegido no ver tu peso. Puedes cambiarlo en Datos › Ajustes." : "El peso es un dato más, no el que manda. Puedes ocultarlo en Datos › Ajustes."}>
        <div className="flex items-stretch divide-x divide-line">
          <Cifra value={String(seguidas)} label={seguidas === 1 ? "revisión seguida" : "revisiones seguidas"} tono="text-success" />
          <Cifra value={waistDelta != null ? `${waistDelta > 0 ? "+" : waistDelta < 0 ? "−" : ""}${Math.abs(waistDelta).toLocaleString("es-ES")} cm` : "—"} label="de cintura" tono={waistDelta != null && waistDelta < 0 ? "text-success" : "text-ink"} />
          <Cifra value={sueno != null ? `${sueno.toLocaleString("es-ES", { maximumFractionDigits: 1 })} h` : "—"} label="de sueño de media" />
        </div>
        <Linea puntos={cinturas} />
        {hayPeso && (
          <Fila titulo="Peso" detalle={`${kg(lastWeight)} kg${deltaTxt}`} tono={weightDelta != null && weightDelta < 0 ? "success" : "muted"} href="/miembros/perfil?tab=cuestionario" />
        )}
        {meta && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-[13px] text-ink-muted mb-1.5">
              <span>{meta.reached ? "Objetivo alcanzado" : `Te quedan ${kg(meta.remaining)} kg para tu meta de ${goalWeight} kg`}</span>
              <span className="text-success font-semibold">{Math.round(meta.pct)} %</span>
            </div>
            <div className="h-1 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-success" style={{ width: `${meta.pct}%` }} /></div>
          </div>
        )}
      </Grupo>

      {beforePhoto && afterPhoto && beforePhoto !== afterPhoto && (
        <Grupo label="Antes y ahora" foot={<Privado>Solo tú y tu coach veis estas fotos.</Privado>}>
          <div className="grid grid-cols-2 gap-2 p-4">
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforePhoto} alt="Antes" loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover rounded-[10px] bg-surface-2" />
              <figcaption className="text-[13px] text-ink-muted mt-1">Antes{beforeDate ? ` · ${beforeDate}` : ""}</figcaption>
            </figure>
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterPhoto} alt="Ahora" loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover rounded-[10px] bg-surface-2" />
              <figcaption className="text-[13px] text-success mt-1">Ahora{afterDate ? ` · ${afterDate}` : ""}</figcaption>
            </figure>
          </div>
        </Grupo>
      )}
      {total >= 1 && !hayPeso && !ocultarPeso && firstWeight == null && (
        <p className="text-[13px] text-ink-muted px-4 -mt-2"><Link href="/miembros/checkins" className="text-brand">Apunta tu peso</Link> en la próxima revisión si quieres verlo aquí.</p>
      )}
    </div>
  );
}
