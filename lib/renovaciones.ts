/**
 * Cuándo toca renovarle a cada clienta la planificación.
 *
 *  · ALIMENTACIÓN: se cambia el día 1 de cada mes.
 *  · ENTRENAMIENTO: cada doce semanas. Antes se decía «dos o tres meses» y cada
 *    clienta acababa con su propio ciclo; se fija en doce para que sea una sola
 *    cuenta y no haya que recordar cuál llevaba cuál.
 *
 * El reloj arranca con la SUBIDA del plan, no con el alta: subir un plan nuevo
 * vuelve a poner el contador a cero él solo, porque todo se calcula a partir de
 * la fecha del último plan de ese tipo. No hay nada que marcar a mano.
 *
 * Todo en horario de Madrid: en UTC, entre las 00:00 y las 02:00 el servidor
 * creería que aún es el día anterior y el día 1 empezaría tarde.
 *
 * Sin dependencias de servidor: los componentes cliente también lo importan.
 */

/** Día del mes en que se cambia la alimentación. */
export const DIA_ALIMENTACION = 1;

/**
 * Margen para no renovar una alimentación recién subida.
 *
 * Si un plan se subió a menos de estos días del próximo día 1, cambiarlo
 * entonces dejaría a la clienta con él apenas una semana. En ese caso se salta
 * al día 1 siguiente: se queda «un mes y poquito», que es lo razonable.
 */
export const MARGEN_ALIMENTACION = 10;

/** Semanas entre planes de entrenamiento. */
export const SEMANAS_ENTRENAMIENTO = 12;

export type Urgencia = "sin-plan" | "vencida" | "hoy" | "pronto" | "ok";

export type Renovacion = {
  /** Fecha (YYYY-MM-DD) del último plan de este tipo, si lo hay. */
  ultima: string | null;
  /** Fecha (YYYY-MM-DD) en que toca el siguiente, si se puede calcular. */
  toca: string | null;
  /** Días que faltan. Negativo = vencida. Null si no hay plan. */
  dias: number | null;
  urgencia: Urgencia;
  /** Frase corta para la pastilla de estado. */
  texto: string;
  /** Explicación cuando la fecha no es la que se esperaría a simple vista. */
  nota?: string;
};

/** Hoy en Madrid, como YYYY-MM-DD. */
export function hoyMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);
}

/** Fecha de un timestamp en horario de Madrid, como YYYY-MM-DD. */
export function diaDe(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));
}

/** Días entre dos fechas YYYY-MM-DD (b − a). Sin horas de por medio. */
export function diasEntre(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
             Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86400000);
}

/** Suma días a una fecha YYYY-MM-DD. */
export function sumaDias(fecha: string, dias: number): string {
  const d = new Date(Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** El día 1 del mes siguiente a `fecha`. */
function primeroSiguiente(fecha: string): string {
  const y = +fecha.slice(0, 4);
  const m = +fecha.slice(5, 7);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

function urgenciaDe(dias: number): Urgencia {
  if (dias < 0) return "vencida";
  if (dias === 0) return "hoy";
  return dias <= 7 ? "pronto" : "ok";
}

function textoDe(dias: number): string {
  if (dias < 0) return `Vencida hace ${-dias} ${-dias === 1 ? "día" : "días"}`;
  if (dias === 0) return "Toca hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

/** Fecha larga en castellano: «1 de octubre». */
export function fechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(fecha + "T12:00:00Z"));
}

/**
 * Cuándo toca la próxima planificación de ALIMENTACIÓN.
 *
 * @param ultima  fecha (YYYY-MM-DD) del último plan de nutrición, o null
 * @param hoy     fecha de hoy (YYYY-MM-DD) en Madrid
 */
export function renovacionAlimentacion(ultima: string | null, hoy: string): Renovacion {
  if (!ultima) {
    return { ultima: null, toca: null, dias: null, urgencia: "sin-plan", texto: "Sin plan todavía" };
  }
  let toca = primeroSiguiente(ultima);
  let nota: string | undefined;
  // Subida pegada al día 1: se salta al mes siguiente para que no le dure cuatro días.
  if (diasEntre(ultima, toca) < MARGEN_ALIMENTACION) {
    nota = `Se subió el ${fechaCorta(ultima)}, a ${diasEntre(ultima, toca)} días del 1: se salta ese mes para que no le dure cuatro días.`;
    toca = primeroSiguiente(toca);
  }
  const dias = diasEntre(hoy, toca);
  return { ultima, toca, dias, urgencia: urgenciaDe(dias), texto: textoDe(dias), nota };
}

/** Cuándo toca la próxima planificación de ENTRENAMIENTO (doce semanas). */
export function renovacionEntrenamiento(ultima: string | null, hoy: string): Renovacion {
  if (!ultima) {
    return { ultima: null, toca: null, dias: null, urgencia: "sin-plan", texto: "Sin plan todavía" };
  }
  const toca = sumaDias(ultima, SEMANAS_ENTRENAMIENTO * 7);
  const dias = diasEntre(hoy, toca);
  return { ultima, toca, dias, urgencia: urgenciaDe(dias), texto: textoDe(dias) };
}

/** Para ordenar: primero lo más urgente. */
export function ordenUrgencia(r: Renovacion): number {
  if (r.urgencia === "sin-plan") return -1e9;
  return r.dias ?? 1e9;
}
