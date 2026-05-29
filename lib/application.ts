/**
 * Cuestionario de calificación del servicio (landing /aplicar), tipo quiz
 * paso a paso.
 *
 * Cada opción puede marcar `disqualifies: true`. Una persona CALIFICA si
 * responde todas las preguntas y NINGUNA de sus respuestas descalifica.
 *
 * Editar aquí cambia a la vez el formulario (cliente) y la lógica (servidor).
 */

export type Option = { value: string; label: string; disqualifies?: boolean };
export type Question = { id: string; label: string; options: Option[] };

export const QUESTIONS: Question[] = [
  {
    id: "objetivo",
    label: "¿Cuál es tu objetivo?",
    options: [
      { value: "perder", label: "Perder peso" },
      { value: "tonificar", label: "Tonificar y definir" },
      { value: "habitos", label: "Mejorar mis hábitos y energía" },
      { value: "transformacion", label: "Una transformación completa (cuerpo y mente)" },
    ],
  },
  {
    id: "edad",
    label: "¿Qué edad tienes?",
    options: [
      { value: "-25", label: "Menos de 25", disqualifies: true },
      { value: "25-30", label: "25 - 30" },
      { value: "31-35", label: "31 - 35" },
      { value: "36-40", label: "36 - 40" },
      { value: "+40", label: "Más de 40", disqualifies: true },
    ],
  },
  {
    id: "invertir",
    label: "¿Estás lista para invertir en ti, dedicando tiempo y dinero a tu transformación?",
    options: [
      { value: "si", label: "Sí, estoy decidida" },
      { value: "considerando", label: "Lo estoy considerando seriamente" },
      { value: "no", label: "No, ahora mismo no", disqualifies: true },
    ],
  },
  {
    id: "inversion",
    label:
      "Una transformación real lleva al menos 90 días. ¿Cuánto estarías dispuesta a invertir en ti si te aseguramos que consigues tu objetivo, firmado por contrato y con garantía?",
    options: [
      { value: "-300", label: "Menos de 300 €", disqualifies: true },
      { value: "300-700", label: "Entre 300 € y 700 €" },
      { value: "700-1500", label: "Entre 700 € y 1.500 €" },
      { value: "1500+", label: "Más de 1.500 €" },
    ],
  },
  {
    id: "region",
    label: "¿Desde dónde nos contactas?",
    options: [
      { value: "europa", label: "Europa" },
      { value: "latam", label: "Latinoamérica" },
      { value: "otro", label: "Otro" },
    ],
  },
  {
    id: "situacion",
    label: "¿Cuál es tu situación actual?",
    options: [
      { value: "trabajo", label: "Trabajo" },
      { value: "no_trabajo", label: "No trabajo ahora mismo" },
      { value: "estudio", label: "Estudio" },
      { value: "padres", label: "Mi economía depende de mis padres", disqualifies: true },
    ],
  },
];

export type Answers = Record<string, string>;

/** Devuelve true si respondió todas y ninguna respuesta descalifica. */
export function isQualified(answers: Answers): boolean {
  return QUESTIONS.every((q) => {
    const opt = q.options.find((o) => o.value === answers[q.id]);
    return !!opt && !opt.disqualifies;
  });
}

/** Texto legible de las respuestas (para la notificación al equipo). */
export function answersToText(answers: Answers): string {
  return QUESTIONS.map((q) => {
    const opt = q.options.find((o) => o.value === answers[q.id]);
    return `• ${q.label}\n   → ${opt ? opt.label : "(sin responder)"}`;
  }).join("\n");
}
