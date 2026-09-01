/**
 * Comparativa entre revisiones de una clienta: qué mejora y qué empeora.
 *
 * Vive aparte del componente para poder probarlo sin montar React, porque la
 * parte delicada no es pintar flechas sino DECIDIR qué es mejorar, y eso
 * depende del objetivo de cada clienta.
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

/** Hacia dónde es mejorar: bajando, subiendo, o no está claro. */
export type Direccion = "baja" | "sube" | "neutra";

/**
 * ¿Qué es mejorar en esta medida para esta clienta?
 *
 * Solo se moja donde la respuesta es defendible. Que a una clienta que quiere
 * perder grasa le baje el glúteo NO es una mejora, y pintarlo en verde sería
 * mentirle a la coach; por eso ahí la dirección es «neutra»: el número se
 * enseña igual, pero sin veredicto. Más vale un hueco honesto que un color
 * inventado, que es lo que luego se mira de un vistazo y se da por bueno.
 */
export function direccionDe(key: ClaveMedida, objetivo?: string | null): Direccion {
  const o = (objetivo ?? "").trim();

  if (o === "Perder grasa") {
    if (key === "weight" || key === "waist" || key === "hips") return "baja";
    return "neutra";
  }
  if (o === "Tonificar") {
    if (key === "waist") return "baja";
    if (key === "glute" || key === "arm" || key === "chest" || key === "back") return "sube";
    return "neutra";
  }
  if (o === "Ganar músculo") {
    if (key === "waist") return "neutra";
    return "sube"; // peso y todos los perímetros
  }
  if (o === "Salud y hábitos") {
    return key === "waist" ? "baja" : "neutra";
  }
  return "neutra"; // sin objetivo en el cuestionario, no se opina
}

export type Veredicto = "mejora" | "empeora" | "igual" | "sin-direccion";

export type Cambio = {
  key: ClaveMedida;
  label: string;
  unidad: string;
  valor: number;
  /** Diferencia con la revisión de referencia. null si no hay con qué comparar. */
  delta: number | null;
  direccion: Direccion;
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
  referencia: Record<string, unknown> | null,
  objetivo?: string | null
): Cambio[] {
  const salida: Cambio[] = [];
  for (const m of MEDIDAS) {
    const v = num(actual[m.key]);
    if (v === null) continue; // esta revisión no trae esta medida
    const antes = referencia ? num(referencia[m.key]) : null;
    const delta = antes === null ? null : Math.round((v - antes) * 10) / 10;
    const direccion = direccionDe(m.key, objetivo);
    let veredicto: Veredicto = "sin-direccion";
    if (delta !== null) {
      if (delta === 0) veredicto = "igual";
      else if (direccion === "neutra") veredicto = "sin-direccion";
      else if ((direccion === "baja" && delta < 0) || (direccion === "sube" && delta > 0)) veredicto = "mejora";
      else veredicto = "empeora";
    }
    salida.push({ key: m.key, label: m.label, unidad: m.unidad, valor: v, delta, direccion, veredicto });
  }
  return salida;
}

export type Balance = { mejora: number; empeora: number; igual: number; sinDireccion: number };

/** Cuántas medidas van bien y cuántas mal, para el resumen de la sesión. */
export function balance(cambios: Cambio[]): Balance {
  const b: Balance = { mejora: 0, empeora: 0, igual: 0, sinDireccion: 0 };
  for (const c of cambios) {
    if (c.delta === null) continue;
    if (c.veredicto === "mejora") b.mejora++;
    else if (c.veredicto === "empeora") b.empeora++;
    else if (c.veredicto === "igual") b.igual++;
    else b.sinDireccion++;
  }
  return b;
}

/** Frase de una línea para encabezar la sesión. */
export function tituloBalance(b: Balance): { texto: string; tono: "bien" | "mal" | "neutro" } {
  const conVeredicto = b.mejora + b.empeora;
  if (conVeredicto === 0) {
    if (b.igual > 0) return { texto: "Sin cambios respecto a la anterior", tono: "neutro" };
    return { texto: "Sin dirección marcada para su objetivo", tono: "neutro" };
  }
  if (b.empeora === 0) return { texto: `Mejora en ${b.mejora} de ${conVeredicto}`, tono: "bien" };
  if (b.mejora === 0) return { texto: `Retrocede en ${b.empeora} de ${conVeredicto}`, tono: "mal" };
  return { texto: `Mejora en ${b.mejora}, retrocede en ${b.empeora}`, tono: b.mejora >= b.empeora ? "bien" : "mal" };
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
