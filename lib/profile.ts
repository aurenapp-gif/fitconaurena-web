/** Cuestionario del perfil de la clienta (datos para su plan personalizado). */

export type Field = {
  id: string;
  label: string;
  type: "number" | "text" | "textarea" | "select";
  options?: string[];
};

export const PROFILE_FIELDS: Field[] = [
  { id: "edad", label: "Edad", type: "number" },
  { id: "altura", label: "Altura (cm)", type: "number" },
  { id: "peso_actual", label: "Peso actual (kg) — opcional", type: "number" },
  { id: "peso_objetivo", label: "Peso objetivo (kg) — opcional", type: "number" },
  { id: "objetivo", label: "Objetivo principal", type: "select", options: ["Perder grasa", "Tonificar", "Ganar músculo", "Salud y hábitos"] },
  { id: "nivel_actividad", label: "Nivel de actividad diaria", type: "select", options: ["Sedentaria", "Ligera", "Activa", "Muy activa"] },
  { id: "pasos_dia", label: "Pasos diarios de media", type: "number" },
  { id: "dias_entreno", label: "Días que puedes entrenar por semana", type: "select", options: ["1-2", "3-4", "5-6"] },
  { id: "lugar_entreno", label: "¿Dónde entrenas?", type: "select", options: ["Casa", "Gimnasio", "Ambos"] },
  { id: "experiencia", label: "Experiencia entrenando", type: "select", options: ["Principiante", "Intermedia", "Avanzada"] },
  { id: "comidas_dia", label: "Comidas al día que prefieres", type: "select", options: ["3", "4", "5"] },
  { id: "lesiones", label: "Lesiones o limitaciones", type: "textarea" },
  { id: "alergias", label: "Alergias o intolerancias", type: "textarea" },
  { id: "alimentos_evitar", label: "Alimentos que no te gustan o quieres evitar", type: "textarea" },
  { id: "ciclo", label: "Ciclo menstrual", type: "select", options: ["Regular", "Irregular", "No aplica"] },
  { id: "notas", label: "Algo más que tu coach deba saber", type: "textarea" },
];

export type Questionnaire = Record<string, string>;

/** Campos mínimos para poder ENVIAR el cuestionario (y arrancar el ciclo de
 * avisos del plan). Usado en cliente (habilitar el botón) y servidor (validar).
 *
 * Los pesos NO son obligatorios a propósito: hay clientas que prefieren no
 * pesarse, y deben poder enviar su cuestionario igualmente (pueden seguir su
 * progreso con medidas y fotos). */
export const REQUIRED_QUESTIONNAIRE = ["edad", "altura", "objetivo"];

/** ¿Están todos los campos obligatorios rellenos? */
export function questionnaireComplete(q: Questionnaire): boolean {
  return REQUIRED_QUESTIONNAIRE.every((k) => (q[k] ?? "").toString().trim() !== "");
}

/** Fecha (YYYY-MM-DD) un mes después de `from` (por defecto, hoy). */
export function plusOneMonthISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * ¿Es una fecha YYYY-MM-DD que existe de verdad?
 *
 * Con comprobar solo el formato no basta: «2027-13-45» lo cumple y llega a la
 * base de datos, que lo rechaza con un error feo (500) en vez de un aviso
 * claro. Aquí se reconstruye la fecha y se comprueba que Javascript no la haya
 * corrido de día.
 */
export function isValidDateISO(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Duración del servicio contratado. Hoy todos son de doce meses. */
export const SERVICE_MONTHS = 12;

/**
 * Fecha (YYYY-MM-DD) en que vence el servicio: doce meses desde el alta.
 *
 * `setMonth` con desbordamiento hace lo correcto para nosotros: un alta el 31
 * de agosto vencería el 31 de agosto siguiente; y en los meses cortos (31 de
 * enero → 31 de febrero) Javascript lo pasa al 2 o 3 de marzo, un día de más
 * que nunca perjudica a la clienta.
 */
export function serviceEndISO(from: Date | string = new Date()): string {
  const d = typeof from === "string" ? new Date(from + "T12:00:00Z") : new Date(from);
  d.setMonth(d.getMonth() + SERVICE_MONTHS);
  return d.toISOString().slice(0, 10);
}

/**
 * ¿Hay que ponerle vencimiento nuevo al dar de alta a esta clienta?
 *
 * Sí cuando no tiene ninguno (alta nueva) o cuando el que tiene ya venció
 * (renovación de verdad). NO cuando le queda uno por delante: repetir el alta
 * de una clienta —porque falló el correo, porque se corrige el nombre— no puede
 * regalarle otros doce meses. Ya ha pasado que un alta se repite el mismo día.
 *
 * @param actual  vencimiento que ya consta, si lo hay
 * @returns la fecha nueva a guardar, o null si hay que dejar el que tiene
 */
export function nuevoVencimiento(actual: string | null | undefined, now: Date = new Date()): string | null {
  if (actual) {
    // Vale todo el día del vencimiento: se compara contra su final.
    const vigente = new Date(actual + "T23:59:59Z").getTime() > now.getTime();
    if (vigente) return null;
  }
  return serviceEndISO(now);
}

/** Info del vencimiento del servicio, para pintarlo en la ficha. */
export function serviceEndInfo(date: string | null | undefined): { text: string; urgent: boolean; days: number | null } {
  if (!date) return { text: "Sin fecha de vencimiento", urgent: false, days: null };
  const days = Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Servicio vencido hace ${-days} d`, urgent: true, days };
  if (days === 0) return { text: "Vence hoy", urgent: true, days };
  if (days <= 60) return { text: `Vence en ${days} día${days > 1 ? "s" : ""}`, urgent: days <= 30, days };
  const meses = Math.round(days / 30);
  return { text: `Quedan ${meses} meses`, urgent: false, days };
}

/** Info de renovación del plan (se renueva mensualmente). */
export function renewalInfo(date: string | null): { text: string; urgent: boolean; days: number | null } {
  if (!date) return { text: "Sin fecha de renovación", urgent: false, days: null };
  const days = Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Renovación vencida (${-days} d)`, urgent: true, days };
  if (days === 0) return { text: "¡Renueva hoy!", urgent: true, days };
  return { text: `Renueva en ${days} día${days > 1 ? "s" : ""}`, urgent: days <= 5, days };
}

/** Limpia el cuestionario quedándose solo con campos conocidos (string). */
export function sanitizeQuestionnaire(input: unknown): Questionnaire {
  const out: Questionnaire = {};
  if (input && typeof input === "object") {
    for (const f of PROFILE_FIELDS) {
      const v = (input as Record<string, unknown>)[f.id];
      if (typeof v === "string") out[f.id] = v.slice(0, 1000);
      else if (typeof v === "number") out[f.id] = String(v);
    }
  }
  return out;
}
