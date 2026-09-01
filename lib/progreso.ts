/**
 * Comparativa entre revisiones de una clienta: qué baja y qué sube.
 *
 * Regla única y sin excepciones: BAJAR SE PINTA EN AZUL, subir en rojo. No se
 * mira el objetivo del cuestionario ni se intenta adivinar qué conviene a cada
 * una; la lectura la hace la coach. Una regla que siempre significa lo mismo se
 * lee de un vistazo, que es justo para lo que sirve esta pantalla.
 *
 * Vive aparte del componente para poder probarlo sin montar React.
 */

export type ClaveMedida =
  | "weight" | "chest" | "back" | "arm" | "waist" | "hips" | "glute" | "thigh";

export type Medida = { key: ClaveMedida; label: string; unidad: string };

/** Mismo orden que el formulario de la clienta (de arriba abajo del cuerpo). */
export const MEDIDAS: Medida[] = [
  { key: "weight", label: "Peso", unidad: "kg" },
  { key: "chest", label: "Pecho", unidad: "cm" },
  { key: "back", label: "Espalda", unidad: "cm" },
  { key: "arm", label: "Brazo", unidad: "cm" },
  { key: "waist", label: "Cintura", unidad: "cm" },
  { key: "hips", label: "Cadera", unidad: "cm" },
  { key: "glute", label: "Glúteo", unidad: "cm" },
  { key: "thigh", label: "Cuádriceps", unidad: "cm" },
];

export type Veredicto = "baja" | "sube" | "igual";

export type Cambio = {
  key: ClaveMedida;
  label: string;
  unidad: string;
  valor: number;
  /** Diferencia con la revisión de referencia. null si no hay con qué comparar. */
  delta: number | null;
  veredicto: Veredicto;
};

/**
 * Número válido o null (un valor corrupto no debe teñir de rojo una ficha).
 *
 * Ojo con `null` y con la cadena vacía: `Number(null)` y `Number("")` valen 0,
 * que es finito. Sin descartarlos antes, una medida que la clienta dejó en
 * blanco saldría en pantalla como «Peso: 0 kg» y con su flecha de caída.
 */
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Diferencias de una revisión respecto a otra (normalmente la anterior).
 *
 * Se redondea a un decimal antes de comparar: sin eso, dos medidas iguales
 * tomadas como 70 y 70.0000001 saldrían como «empeora», y la coach vería
 * ruido donde no pasa nada.
 */
export function comparar(
  actual: Record<string, unknown>,
  referencia: Record<string, unknown> | null
): Cambio[] {
  const salida: Cambio[] = [];
  for (const m of MEDIDAS) {
    const v = num(actual[m.key]);
    if (v === null) continue; // esta revisión no trae esta medida
    const antes = referencia ? num(referencia[m.key]) : null;
    const delta = antes === null ? null : Math.round((v - antes) * 10) / 10;
    const veredicto: Veredicto = delta === null || delta === 0 ? "igual" : delta < 0 ? "baja" : "sube";
    salida.push({ key: m.key, label: m.label, unidad: m.unidad, valor: v, delta, veredicto });
  }
  return salida;
}

export type Balance = { baja: number; sube: number; igual: number };

/** Cuántas medidas bajan, cuántas suben y cuántas siguen igual. */
export function balance(cambios: Cambio[]): Balance {
  const b: Balance = { baja: 0, sube: 0, igual: 0 };
  for (const c of cambios) {
    if (c.delta === null) continue;
    if (c.veredicto === "baja") b.baja++;
    else if (c.veredicto === "sube") b.sube++;
    else b.igual++;
  }
  return b;
}

/** Frase de una línea para encabezar la sesión. */
export function tituloBalance(b: Balance): { texto: string; tono: "bien" | "mal" | "neutro" } {
  const conCambio = b.baja + b.sube;
  if (conCambio === 0) {
    return { texto: b.igual > 0 ? "Sin cambios" : "Sin nada que comparar", tono: "neutro" };
  }
  if (b.sube === 0) return { texto: `Baja en ${b.baja} de ${conCambio}`, tono: "bien" };
  if (b.baja === 0) return { texto: `Sube en ${b.sube} de ${conCambio}`, tono: "mal" };
  return { texto: `Baja en ${b.baja}, sube en ${b.sube}`, tono: b.baja >= b.sube ? "bien" : "mal" };
}

/** «+1,2 kg» / «−0,5 cm» — con el signo delante y coma decimal. */
export function textoDelta(delta: number, unidad: string): string {
  const abs = Math.abs(delta).toLocaleString("es-ES", { maximumFractionDigits: 1 });
  const signo = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${signo}${abs} ${unidad}`;
}

/** Cómo se llama el objetivo en pantalla, o null si no consta. */
export function objetivoDe(q: Record<string, string> | null | undefined): string | null {
  const o = (q?.objetivo ?? "").trim();
  return o || null;
}
