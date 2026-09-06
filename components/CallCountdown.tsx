"use client";

import { useEffect, useState } from "react";
import { diaLlamada, faltaPara, proximaLlamada } from "@/lib/llamada-grupal";

// La URL de la sala llega como prop desde el servidor (solo para miembros con
// sesión), así no se incrusta en el bundle del cliente ni queda pública.

function Box({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-black text-ink tabular-nums" style={{ fontSize: "clamp(1.6rem,5vw,2.4rem)" }}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-ink-subtle">{label}</span>
    </div>
  );
}

/**
 * Cuenta atrás para la videollamada grupal (jueves, 17:30 de Madrid).
 *
 * `variant="fila"` es la versión de una línea para el bloque «Hoy» del inicio:
 * el día y la hora a la izquierda, lo que falta a la derecha, y el enlace a la
 * sala solo cuando está en directo.
 */
export default function CallCountdown({ callUrl = "", variant = "tarjeta" }: { callUrl?: string; variant?: "tarjeta" | "fila" }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (variant === "fila") {
    // Sin montar aún no hay hora fiable: se enseña lo fijo, que ya informa.
    const target = now === null ? null : proximaLlamada(now);
    const live = target !== null && now !== null && target <= now;
    return (
      <div className="flex items-center justify-between gap-3 min-h-[46px] px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[17px] text-ink leading-[22px]">Llamada de grupo</p>
          <p className="text-[15px] text-ink-muted leading-5 truncate">
            {target === null ? "Jueves a las 17:30" : `${diaLlamada(target)} · 17:30`}
          </p>
        </div>
        {live && callUrl ? (
          <a href={callUrl} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-4 !min-h-[40px] shrink-0 animate-pulse">
            Entrar
          </a>
        ) : (
          <span className={`text-[17px] shrink-0 whitespace-nowrap ${live ? "text-brand" : "text-ink-subtle"}`}>
            {target === null || now === null ? "" : faltaPara(target, now)}
          </span>
        )}
      </div>
    );
  }

  // Evita desajuste de hidratación: no renderiza números hasta montar en cliente.
  if (now === null) {
    return (
      <div className="card-dark p-6 !transform-none">
        <h3 className="font-bold text-ink mb-1">Videollamada grupal</h3>
        <p className="text-sm text-ink-muted">Todos los jueves a las 17:30 (hora de Madrid).</p>
      </div>
    );
  }

  const target = proximaLlamada(now);
  const diff = target - now;
  const live = diff <= 0;

  const s = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  return (
    <div className="card-dark p-6 !transform-none border-brand/30">
      <h3 className="font-bold text-ink mb-1">Videollamada grupal</h3>
      <p className="text-sm text-ink-muted">Todos los jueves a las 17:30 (hora de Madrid).</p>

      {live ? (
        <p className="mt-5 font-black text-brand text-xl">¡En directo ahora! 🔴</p>
      ) : (
        <div className="mt-5 flex gap-5">
          <Box value={days} label="días" />
          <Box value={hours} label="horas" />
          <Box value={mins} label="min" />
          <Box value={secs} label="seg" />
        </div>
      )}

      {callUrl && (
        <a
          href={callUrl}
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
