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
