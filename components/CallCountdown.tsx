"use client";

import { useEffect, useState } from "react";

// URL de la videollamada (configurable). Por defecto vacía → sin botón.
const CALL_URL = process.env.NEXT_PUBLIC_CALL_URL ?? "";

function madridWallToUTC(y: number, m: number, d: number, h: number, min: number): number {
  const asUTC = Date.UTC(y, m - 1, d, h, min);
  const madridStr = new Date(asUTC).toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const offset = new Date(madridStr).getTime() - asUTC;
  return asUTC - offset;
}

// Próximo jueves a las 17:30 (hora de Madrid). Sigue contando como "esta
// semana" hasta 2h después de empezar.
function nextCall(now: number): number {
  for (let i = 0; i < 14; i++) {
    const base = new Date(now + i * 86400000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(base);
    const get = (t: string) => parts.find((x) => x.type === t)!.value;
    if (get("weekday") !== "Thu") continue;
    const t = madridWallToUTC(+get("year"), +get("month"), +get("day"), 17, 30);
    if (t > now - 2 * 3600000) return t;
  }
  return now;
}

function Box({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-black text-white tabular-nums" style={{ fontSize: "clamp(1.6rem,5vw,2.4rem)" }}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-[#666666]">{label}</span>
    </div>
  );
}

export default function CallCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Evita desajuste de hidratación: no renderiza números hasta montar en cliente.
  if (now === null) {
    return (
      <div className="card-dark p-6 !transform-none">
        <h3 className="font-bold text-white mb-1">Videollamada grupal</h3>
        <p className="text-sm text-[#A0A0A0]">Todos los jueves a las 17:30 (hora de Madrid).</p>
      </div>
    );
  }

  const target = nextCall(now);
  const diff = target - now;
  const live = diff <= 0;

  const s = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  return (
    <div className="card-dark p-6 !transform-none border-[#1CA0E3]/30">
      <h3 className="font-bold text-white mb-1">Videollamada grupal</h3>
      <p className="text-sm text-[#A0A0A0]">Todos los jueves a las 17:30 (hora de Madrid).</p>

      {live ? (
        <p className="mt-5 font-black text-[#1CA0E3] text-xl">¡En directo ahora! 🔴</p>
      ) : (
        <div className="mt-5 flex gap-5">
          <Box value={days} label="días" />
          <Box value={hours} label="horas" />
          <Box value={mins} label="min" />
          <Box value={secs} label="seg" />
        </div>
      )}

      {CALL_URL && (
        <a
          href={CALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn-brand text-base px-8 py-3.5 mt-6 inline-flex ${live ? "animate-pulse" : ""}`}
        >
          Accede a la sala
        </a>
      )}
    </div>
  );
}
