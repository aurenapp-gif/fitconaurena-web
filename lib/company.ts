/**
 * Datos identificativos de la empresa que presta el servicio.
 * Fuente única: los avisos legales (privacidad, términos, cookies) y los
 * emails legales se apoyan en estas constantes.
 */
export const COMPANY = {
  name: "Vento Cogitativo Unipessoal Lda.",
  address: "Avenida Gomes Pereira, 105",
  city: "Lisboa",
  postalCode: "1500-328",
  country: "Portugal",
  nipc: "519216121",
  email: "aurenapp@gmail.com",
  brand: "Programa FITCON",
} as const;

/** Dirección completa en una línea, para pies de página y avisos. */
export function companyAddress(): string {
  const parts = [COMPANY.address, [COMPANY.postalCode, COMPANY.city].filter(Boolean).join(" "), COMPANY.country];
  return parts.filter(Boolean).join(", ");
}

/** Identificación resumida ("Nombre, dirección · NIPC X"). */
export function companyLine(): string {
  const nipc = COMPANY.nipc ? ` · NIPC ${COMPANY.nipc}` : "";
  return `${COMPANY.name}, ${companyAddress()}${nipc}`;
}

/**
 * Peso contractual del servicio. Estrategia y planificación son la parte más
 * exigente del proceso; el seguimiento y las adaptaciones ocupan el resto.
 * Ambos valores han de sumar 100.
 */
export const SERVICE_WEIGHTS = { plan: 70, followup: 30 } as const;

/**
 * Porcentaje del servicio consumido en el ciclo pagado en curso.
 *
 * Fiel al apartado 6 de los Términos:
 *   • Al entregar el plan del ciclo actual, el contador salta a 70 %.
 *   • El 30 % restante se prorratea linealmente desde esa entrega hasta el fin
 *     del ciclo (seguimiento y adaptaciones).
 *   • Si aún no hay plan entregado en este ciclo, el 70 % se prorratea sobre
 *     una ventana estimada de 7 días desde el inicio del ciclo, para reflejar
 *     que la coach ya ha empezado a preparar la estrategia.
 *   • Si el ciclo ha vencido, se considera 100 %.
 *
 * @param renewal  fecha ISO de renovación (fin del ciclo actual)
 * @param planDates fechas de todos los planes de esta clienta
 */
export function servicePct(
  renewal: string | null | undefined,
  planDates: string[] = []
): { pct: number; from: Date; to: Date } | null {
  if (!renewal) return null;
  const to = new Date(renewal + "T00:00:00Z");
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - 1);
  const total = to.getTime() - from.getTime();
  if (total <= 0) return null;

  const now = Date.now();
  if (now >= to.getTime()) return { pct: 100, from, to };

  // ¿Se entregó ya el plan del ciclo actual? Basta con que la fecha de un plan
  // esté dentro del ciclo (o en él justo por su inicio).
  const fromMs = from.getTime();
  const cycleStartsMs = fromMs;
  const cycleEndsMs = to.getTime();
  const planInCycle = planDates
    .map((d) => new Date(d).getTime())
    .filter((t) => t >= cycleStartsMs && t <= cycleEndsMs)
    .sort((a, b) => a - b)[0] ?? null;

  const { plan, followup } = SERVICE_WEIGHTS;
  let pct: number;
  if (planInCycle != null) {
    // Fase 2: plan entregado. 70 % fijo + prorrateo del 30 % restante.
    const done = Math.max(0, Math.min(1, (now - planInCycle) / (cycleEndsMs - planInCycle)));
    pct = plan + followup * done;
  } else {
    // Fase 1: aún se está preparando la estrategia. Ventana de 7 días para el 70 %.
    const window = 7 * 86400000;
    const done = Math.max(0, Math.min(1, (now - fromMs) / window));
    pct = plan * done;
  }
  return { pct: Math.round(pct), from, to };
}
