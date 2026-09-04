/**
 * Pauta de agua y suplementación de cada clienta. Tipos y utilidades
 * compartidas entre la ficha de la coach y el perfil de la clienta.
 *
 * Sin dependencias de servidor a propósito: los componentes cliente lo importan.
 */

export type Supplement = {
  id: string;
  member_email: string;
  name: string;
  dose: string | null;
  timing: string | null;
  url: string | null;
  note: string | null;
  created_by?: string | null;
  created_at: string;
};

export const MAX_NAME = 80;
export const MAX_DOSE = 60;
export const MAX_TIMING = 80;
export const MAX_NOTE = 500;

/** Litros al día que se pueden prescribir. Fuera de ahí es una errata. */
export const MIN_AGUA = 0.5;
export const MAX_AGUA = 8;

/**
 * Acepta solo http(s). Un enlace con esquema raro (javascript:, data:…)
 * acabaría pintado como enlace en el área de las clientas, así que se descarta
 * aquí y no llega ni a guardarse.
 */
export function safeLink(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Litros válidos (número dentro del rango) o null. */
export function parseAgua(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n * 10) / 10;
  return r >= MIN_AGUA && r <= MAX_AGUA ? r : null;
}

/**
 * Pasos al día que se pueden prescribir.
 *
 * El mínimo no es un objetivo bajo, es un detector de erratas: quien escribe
 * «8» queriendo decir 8.000 vería a su clienta cumpliendo el objetivo cada
 * mañana antes de desayunar. Y por arriba, 40.000 pasos son ya una barbaridad.
 */
export const MIN_PASOS = 1000;
export const MAX_PASOS = 40000;

/** Pasos válidos (entero dentro del rango) o null. */
export function parsePasos(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[.\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= MIN_PASOS && r <= MAX_PASOS ? r : null;
}

/**
 * «8.000» — con el punto de los miles, como se escribe en español.
 *
 * No vale `toLocaleString("es-ES")`: en español las cifras de cuatro dígitos
 * van sin separador («8000»), y una pauta de pasos se lee mucho peor así.
 */
export function miles(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** «8.000 pasos». */
export function pasos(n: number): string {
  return `${miles(n)} pasos`;
}

/** «2,5 L» — con coma, que es como se escribe en español. */
export function litros(n: number): string {
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} L`;
}

/**
 * Vasos aproximados que son esos litros.
 *
 * La clienta registra su agua en VASOS en el seguimiento de hábitos, así que
 * sin esta equivalencia el objetivo en litros no le diría nada. Un vaso son
 * 250 ml, que es la medida de andar por casa.
 */
export const ML_POR_VASO = 250;
export function vasos(litrosAlDia: number): number {
  return Math.round((litrosAlDia * 1000) / ML_POR_VASO);
}

/** Una línea con la pauta completa: «1 cápsula · con el desayuno». */
export function pauta(s: Pick<Supplement, "dose" | "timing">): string {
  return [s.dose, s.timing].filter(Boolean).join(" · ");
}
