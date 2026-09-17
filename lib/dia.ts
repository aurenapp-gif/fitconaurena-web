/**
 * Qué le toca hoy.
 *
 * El plan de alimentación ya está en datos (lib/plan-estructura.ts). Aquí se
 * decide qué parte de ese plan corresponde a HOY y se lleva la cuenta de lo
 * que ya ha hecho.
 *
 * Un plan puede venir de dos formas y las dos son normales: uno solo para
 * todos los días, o uno distinto por día de la semana. Lo segundo obliga a
 * emparejar «Lunes» del papel con el lunes de verdad, y ahí es donde se cuela
 * el error tonto de enseñarle el martes en domingo.
 */

import type { Comida, EstructuraNutricion } from "@/lib/plan-estructura";

/** Los días como los escribe la gente, sin acentos ni mayúsculas. */
const DIAS_SEMANA = [
  ["domingo", "dom"],
  ["lunes", "lun"],
  ["martes", "mar"],
  ["miercoles", "mier", "mie", "x"],
  ["jueves", "jue"],
  ["viernes", "vie"],
  ["sabado", "sab"],
] as const;

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * A qué día de la semana se refiere el nombre de un día del plan.
 *
 * Devuelve 0-6 (domingo a sábado) o null si no nombra ningún día: «Todos los
 * días», «Día A», «Opción 1». Esos valen para cualquier fecha.
 */
export function diaSemanaDe(nombre: string): number | null {
  const n = sinAcentos(nombre);
  // Gana el que aparece ANTES en el texto, no el que va antes en la semana:
  // «sábado y domingo» es el sábado, y recorriendo la semana en orden salía
  // domingo.
  let mejor: { dia: number; donde: number } | null = null;
  for (let i = 0; i < DIAS_SEMANA.length; i++) {
    for (const a of DIAS_SEMANA[i]) {
      // Palabra entera: si no, «dom» se encontraría dentro de «domingo» y la
      // «x» de miércoles dentro de cualquier cosa.
      const donde = n.search(new RegExp(`(^|[^a-z])${a}([^a-z]|$)`));
      if (donde !== -1 && (mejor === null || donde < mejor.donde)) mejor = { dia: i, donde };
    }
  }
  return mejor?.dia ?? null;
}

/** El día de la semana de una fecha YYYY-MM-DD (0 = domingo). */
export function diaSemanaDeFecha(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

/**
 * Las comidas que le tocan hoy.
 *
 * Si el plan distingue días y hoy no aparece (un plan de cinco días y hoy es
 * domingo), se devuelve vacío: es mejor decirle que hoy su plan no pone nada
 * que enseñarle el lunes como si fuera hoy.
 */
export function comidasDeHoy(plan: EstructuraNutricion | null, fecha: string): { dia: string; comidas: Comida[] } | null {
  if (!plan || !plan.dias.length) return null;

  const conDia = plan.dias.map((d) => ({ d, semana: diaSemanaDe(d.nombre) }));
  const distingue = conDia.some((x) => x.semana !== null);

  if (!distingue) {
    const d = plan.dias[0];
    return { dia: d.nombre, comidas: d.comidas };
  }
  const hoy = diaSemanaDeFecha(fecha);
  const suyo = conDia.find((x) => x.semana === hoy);
  return suyo ? { dia: suyo.d.nombre, comidas: suyo.d.comidas } : null;
}

/**
 * Cómo se resume una comida en una línea: los dos o tres primeros alimentos de
 * su primera opción. Lo justo para reconocerla sin abrirla.
 */
export function resumenComida(c: Comida, max = 3): string {
  const items = c.opciones[0]?.items ?? [];
  const trozos = items.slice(0, max).map((i) => (i.cantidad ? `${i.alimento} ${i.cantidad}` : i.alimento));
  return trozos.join(", ") + (items.length > max ? "…" : "");
}

/**
 * La clave con la que se guarda una comida hecha.
 *
 * Es el nombre normalizado, no su posición: si la coach sube un plan nuevo con
 * las comidas en otro orden, lo que marcó hoy sigue siendo suyo.
 */
export function claveComida(nombre: string): string {
  return sinAcentos(nombre).replace(/\s+/g, " ").slice(0, 60);
}

/** «8:00» → «8:00». Sin hora, cadena vacía: no se inventa una. */
export function momentoDe(c: Comida): string {
  return (c.momento ?? "").trim();
}
