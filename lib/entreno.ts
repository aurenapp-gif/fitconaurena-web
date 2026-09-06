/**
 * Progresión de entrenamiento: en cada revisión la clienta apunta, para cada
 * ejercicio de su plan, el peso y las repeticiones que está moviendo. La app
 * lo compara con la revisión anterior y dice en qué ejercicios progresa más y
 * en cuáles menos.
 *
 * La comparación se hace con el 1RM estimado (Epley: peso × (1 + reps/30)),
 * que es la forma más justa de comparar aunque cambie el número de
 * repeticiones: 40 kg × 8 y 42,5 kg × 6 son casi lo mismo, y 40 × 10 es más.
 *
 * Sin dependencias de servidor: los componentes cliente también lo importan.
 */

export const MAX_EJERCICIOS = 30;
export const MAX_NOMBRE = 60;

export type Ejercicio = { name: string; weight: number | null; reps: number | null };

export type Progreso = Ejercicio & {
  prevWeight: number | null;
  prevReps: number | null;
  /** Variación del 1RM estimado en %, o null si no hay con qué comparar. */
  pct: number | null;
  estado: "sube" | "igual" | "baja" | "nuevo" | "sin-datos";
};

/** 1RM estimado. Con 1 repetición es el propio peso. */
export function e1rm(weight: number, reps: number): number {
  return weight * (1 + Math.max(1, reps) / 30);
}

/** «Sentadilla\nPress banca\n…» → lista limpia, sin repetidos ni vacíos. */
export function parseEjerciciosTexto(txt: string): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const linea of txt.split(/\r?\n/)) {
    const n = linea.replace(/^[\s\-•·*\d.)]+/, "").trim().slice(0, MAX_NOMBRE);
    if (!n) continue;
    const k = n.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(n);
    if (out.length >= MAX_EJERCICIOS) break;
  }
  return out;
}

/** Lista de nombres tal y como viene de la base de datos (jsonb) o nada. */
export function nombresDe(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, MAX_NOMBRE)).slice(0, MAX_EJERCICIOS);
}

/** Ejercicios de una revisión tal y como vienen de la base de datos. */
export function ejerciciosDe(json: unknown): Ejercicio[] {
  if (!Array.isArray(json)) return [];
  const out: Ejercicio[] = [];
  for (const x of json) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, MAX_NOMBRE) : "";
    if (!name) continue;
    out.push({ name, weight: numero(o.weight, 0, 500), reps: numero(o.reps, 1, 100) });
    if (out.length >= MAX_EJERCICIOS) break;
  }
  return out;
}

function numero(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}

/** Valida lo que manda el formulario: solo se guardan filas con algo. */
export function limpiarEjercicios(json: unknown): Ejercicio[] {
  return ejerciciosDe(json).filter((e) => e.weight != null || e.reps != null);
}

/** Compara la revisión actual con la anterior, ejercicio a ejercicio. */
export function compararEntreno(actual: Ejercicio[], anterior: Ejercicio[] | null): Progreso[] {
  const prev = new Map((anterior ?? []).map((e) => [e.name.toLowerCase(), e]));
  return actual.map((e) => {
    const p = prev.get(e.name.toLowerCase());
    const base: Progreso = { ...e, prevWeight: p?.weight ?? null, prevReps: p?.reps ?? null, pct: null, estado: "sin-datos" };
    if (e.weight == null || e.reps == null) return base;
    if (!p || p.weight == null || p.reps == null) return { ...base, estado: "nuevo" };
    const ahora = e1rm(e.weight, e.reps);
    const antes = e1rm(p.weight, p.reps);
    if (antes <= 0) return { ...base, estado: "nuevo" };
    const pct = Math.round(((ahora - antes) / antes) * 1000) / 10;
    return { ...base, pct, estado: pct > 1 ? "sube" : pct < -1 ? "baja" : "igual" };
  });
}

/** Resumen: cuántos suben, cuáles más y cuáles menos. */
export function resumenEntreno(p: Progreso[]): { suben: number; igual: number; bajan: number; mejores: Progreso[]; peores: Progreso[]; comparables: number } {
  const comp = p.filter((x) => x.pct != null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  return {
    comparables: comp.length,
    suben: comp.filter((x) => x.estado === "sube").length,
    igual: comp.filter((x) => x.estado === "igual").length,
    bajan: comp.filter((x) => x.estado === "baja").length,
    mejores: comp.filter((x) => x.estado === "sube").slice(0, 3),
    peores: comp.filter((x) => x.estado !== "sube").slice(-3).reverse(),
  };
}

/** «40 kg × 8» */
export function textoSerie(e: { weight: number | null; reps: number | null }): string {
  if (e.weight == null && e.reps == null) return "—";
  const w = e.weight != null ? `${e.weight.toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg` : "";
  const r = e.reps != null ? `${e.reps} rep${e.reps === 1 ? "" : "s"}` : "";
  return [w, r].filter(Boolean).join(" × ");
}

/** Frase para la clienta según cómo va. */
export function fraseEntreno(r: ReturnType<typeof resumenEntreno>): string {
  if (r.comparables === 0) return "Con la siguiente revisión ya podremos comparar.";
  if (r.bajan === 0 && r.suben > 0) return r.suben === r.comparables ? "Progresas en todo. Eso es constancia." : "Progresas en casi todo.";
  if (r.suben === 0) return "Esta quincena has mantenido. Mantener también es avanzar.";
  return `Progresas en ${r.suben} de ${r.comparables}.`;
}
