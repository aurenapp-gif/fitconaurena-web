// Gráfica de peso (SVG puro, sin dependencias). Presentacional.

export default function WeightChart({
  points,
}: {
  points: { date: string; weight: number }[];
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[#666666]">
        Registra al menos 2 check-ins con peso para ver tu gráfica de progreso.
      </p>
    );
  }

  const W = 600;
  const H = 200;
  const pad = { l: 36, r: 12, t: 12, b: 24 };
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.weight);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const x = (i: number) => pad.l + (i / (xs.length - 1)) * innerW;
  const y = (v: number) => pad.t + (1 - (v - minY) / spanY) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${pad.t + innerH} L ${x(0).toFixed(1)} ${pad.t + innerH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }} role="img" aria-label="Gráfica de peso">
        {/* ejes guía */}
        {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#252525" strokeWidth="1" />
            <text x={4} y={y(v) + 4} fill="#666666" fontSize="11">{v.toFixed(1)}</text>
          </g>
        ))}
        <path d={area} fill="#1CA0E3" fillOpacity="0.08" />
        <path d={line} fill="none" stroke="#1CA0E3" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.weight)} r="3.5" fill="#1CA0E3" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-[#666666] px-1">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}
