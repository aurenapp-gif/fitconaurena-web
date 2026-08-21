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
