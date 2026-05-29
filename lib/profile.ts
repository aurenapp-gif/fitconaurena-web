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
  { id: "peso_actual", label: "Peso actual (kg)", type: "number" },
  { id: "peso_objetivo", label: "Peso objetivo (kg)", type: "number" },
  { id: "objetivo", label: "Objetivo principal", type: "select", options: ["Perder grasa", "Tonificar", "Ganar músculo", "Salud y hábitos"] },
  { id: "nivel_actividad", label: "Nivel de actividad diaria", type: "select", options: ["Sedentaria", "Ligera", "Activa", "Muy activa"] },
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
