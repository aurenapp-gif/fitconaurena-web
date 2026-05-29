/**
 * Cuestionario de calificación del servicio (landing /aplicar).
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
    id: "genero",
    label: "¿Eres mujer?",
    options: [
      { value: "si", label: "Sí" },
      { value: "no", label: "No", disqualifies: true },
    ],
  },
  {
    id: "edad",
    label: "¿Qué edad tienes?",
    options: [
      { value: "-25", label: "Menos de 25", disqualifies: true },
      { value: "25-40", label: "Entre 25 y 40 años" },
      { value: "+40", label: "Más de 40", disqualifies: true },
    ],
  },
  {
    id: "objetivo",
    label: "¿Cuánto peso te gustaría perder?",
    options: [
      { value: "-5", label: "Menos de 5 kg" },
      { value: "5-9", label: "Entre 5 y 9 kg" },
      { value: "+9", label: "Más de 9 kg" },
    ],
  },
  {
    id: "dietas",
    label: "¿Has hecho dietas antes sin resultados duraderos?",
    options: [
      { value: "varias", label: "Sí, varias veces" },
      { value: "alguna", label: "Alguna vez" },
      { value: "no", label: "No, nunca" },
    ],
  },
  {
    id: "tiempo",
    label: "¿Cuánto tiempo tienes en tu día a día?",
    options: [
      { value: "poco", label: "Muy poco, voy a tope" },
      { value: "algo", label: "Algo, si me organizo" },
      { value: "bastante", label: "Bastante" },
    ],
  },
  {
    id: "compromiso",
    label: "¿Estás dispuesta a invertir en un acompañamiento 1:1 para conseguirlo?",
    options: [
      { value: "si", label: "Sí, quiero resultados de una vez" },
      { value: "quiza", label: "Depende de la propuesta" },
      { value: "no", label: "No, ahora mismo no", disqualifies: true },
    ],
  },
  {
    id: "inicio",
    label: "¿Cuándo te gustaría empezar?",
    options: [
      { value: "ya", label: "Ya, cuanto antes" },
      { value: "mes", label: "Este mes" },
      { value: "curioseando", label: "Solo estoy curioseando", disqualifies: true },
    ],
  },
];

export type Answers = Record<string, string>;

/** Devuelve true si respondió todo y ninguna respuesta descalifica. */
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
