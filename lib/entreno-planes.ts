/**
 * Qué plan de entrenamiento enseñar en «Entreno».
 *
 * Una clienta puede tener varios planes subidos (Fase 1, Fase 2…). La app
 * enseñaba solo el último, y quien quería repetir la fase anterior no podía.
 * Ahora elige ella; aquí se decide cuál se abre por defecto y cómo se llama
 * cada uno en el selector.
 *
 * Sin dependencias de servidor: el componente cliente también lo importa.
 */

export type PlanResumen = { id: string; title: string | null; created_at: string };

/** Cuántos planes se ofrecen como mucho. De sobra para un año de fases. */
export const MAX_PLANES_ENTRENO = 12;

/** Nombre del plan en el selector: su título o, si no tiene, la fecha en que se subió. */
export function nombrePlan(p: PlanResumen): string {
  const t = p.title?.trim();
  if (t) return t;
  const f = new Date(p.created_at);
  return Number.isNaN(f.getTime())
    ? "Plan"
    : `Plan del ${f.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}`;
}

/**
 * El plan que se abre. Por orden de preferencia:
 * 1. el que ha pedido en la URL,
 * 2. el de un entreno que se dejó a medias,
 * 3. el que eligió la última vez,
 * 4. el más reciente.
 * Solo se acepta un id que sea de uno de SUS planes.
 *
 * Lo pedido va PRIMERO. Antes mandaba la sesión a medias, y como una sesión
 * sin cerrar dura ocho horas, quien salía del gimnasio sin pulsar «Terminar»
 * se quedaba ocho horas sin poder abrir otro plan: pulsaba «Entrenar con este
 * plan» en otro y el servidor le devolvía el de la sesión. Una elección
 * explícita es una elección explícita.
 */
export function elegirPlan(
  planes: PlanResumen[],
  { sesion, pedido, recordado }: { sesion?: string | null; pedido?: string | null; recordado?: string | null },
): PlanResumen | null {
  if (!planes.length) return null;
  for (const id of [pedido, sesion, recordado]) {
    const p = id ? planes.find((x) => x.id === id) : undefined;
    if (p) return p;
  }
  return [...planes].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

/** Para el selector: del más antiguo al más nuevo, que es el orden de las fases. */
export function ordenSelector(planes: PlanResumen[]): PlanResumen[] {
  return [...planes].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Cookie con el último plan elegido, para que no tenga que elegirlo cada día. */
export const COOKIE_PLAN_ENTRENO = "entreno_plan";
