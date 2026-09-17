/**
 * En qué ejercicios avanza más, y en cuáles menos.
 *
 * La coach ya lo ve con la comparación entre revisiones. Esto es lo mismo
 * mirando sus entrenos, que son muchos más datos y de fechas más cercanas: un
 * ejercicio que sube cinco kilos en un mes se nota aquí antes que en la
 * revisión del día 15.
 *
 * Se compara con 1RM estimada (Epley), no con el peso a secas: pasar de 8
 * repeticiones con 40 kg a 5 con 45 no es una mejora del 12 %, y mirar solo la
 * carga diría que sí.
 */

import { claveEjercicio, type SerieGuardada } from "@/lib/entrenos";

/** Carga máxima estimada a partir de un peso y unas repeticiones (Epley). */
export function e1rm(peso: number, reps: number): number {
  return peso * (1 + reps / 30);
}

export type AvanceEjercicio = {
  nombre: string;
  /** Su mejor serie del primer día que lo hizo. */
  desde: { peso: number; reps: number; cuando: string };
  /** Su mejor serie del último día. */
  hasta: { peso: number; reps: number; cuando: string };
  /** Cuánto ha subido la carga estimada, en tanto por ciento. */
  pct: number;
  /** Kilos de diferencia entre la mejor serie de un día y la del otro. */
  kilos: number;
  /** En cuántos días distintos lo ha entrenado. */
  sesiones: number;
};

type Mejor = { peso: number; reps: number; cuando: string; e: number };

/**
 * El avance de cada ejercicio, del que más sube al que menos.
 *
 * Solo entran los que ha hecho al menos DOS días distintos: con un solo día no
 * hay avance que medir, y enseñar «+0 %» al lado de los demás parece un
 * suspenso cuando lo único que pasa es que acaba de empezar.
 */
export function avancePorEjercicio(series: SerieGuardada[]): AvanceEjercicio[] {
  /** Por ejercicio y por día, su mejor serie. */
  const porDia = new Map<string, Map<string, Mejor>>();
  const nombres = new Map<string, string>();

  for (const s of series) {
    if (s.peso === null || s.reps === null || s.peso <= 0 || s.reps <= 0) continue;
    const k = claveEjercicio(s.ejercicio);
    if (!k) continue;
    if (!nombres.has(k)) nombres.set(k, s.ejercicio);
    const dia = s.created_at.slice(0, 10);
    const dias = porDia.get(k) ?? new Map<string, Mejor>();
    const e = e1rm(s.peso, s.reps);
    const previo = dias.get(dia);
    if (!previo || e > previo.e) dias.set(dia, { peso: s.peso, reps: s.reps, cuando: s.created_at, e });
    porDia.set(k, dias);
  }

  const out: AvanceEjercicio[] = [];
  porDia.forEach((dias, k) => {
    if (dias.size < 2) return;
    const porFecha: { dia: string; m: Mejor }[] = [];
    dias.forEach((m, dia) => porFecha.push({ dia, m }));
    porFecha.sort((a, b) => (a.dia < b.dia ? -1 : 1));
    const ordenados = porFecha.map((x) => x.m);
    const desde = ordenados[0];
    const hasta = ordenados[ordenados.length - 1];
    out.push({
      nombre: nombres.get(k) ?? k,
      desde: { peso: desde.peso, reps: desde.reps, cuando: desde.cuando },
      hasta: { peso: hasta.peso, reps: hasta.reps, cuando: hasta.cuando },
      pct: Math.round(((hasta.e - desde.e) / desde.e) * 100),
      kilos: Math.round((hasta.peso - desde.peso) * 100) / 100,
      sesiones: dias.size,
    });
  });

  return out.sort((a, b) => b.pct - a.pct);
}

/** «+35 %», «igual», «−4 %». El menos es el tipográfico, no un guion. */
export function textoAvance(pct: number): string {
  if (pct === 0) return "igual";
  return pct > 0 ? `+${pct} %` : `−${Math.abs(pct)} %`;
}
