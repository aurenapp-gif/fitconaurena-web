/**
 * Herramientas del programa: utilidades externas que la coach pone a
 * disposición de las clientas (asistentes de IA, calculadoras…).
 *
 * La lista vive en el código a propósito: son pocas, cambian poco y así no
 * dependen de la base de datos ni de una pantalla de administración. Para
 * añadir una nueva, basta con sumar una entrada aquí.
 */

export type Tool = {
  /** Identificador estable, se usa en el registro de actividad. */
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  /** Aviso breve de cómo usarla, si aporta algo. */
  hint?: string;
};

export const TOOLS: Tool[] = [
  {
    id: "carta-libre",
    name: "Carta libre",
    description:
      "Hazme una foto a la carta y te digo exactamente qué pedir para disfrutar sin frenar tu progreso.",
    url: "https://chatgpt.com/g/g-6a82c7c33c188191b0de038eebd6eb70-carta-libre-by-fitcondamian",
    icon: "🍽️",
    hint: "Se abre en ChatGPT. Sube la foto de la carta y te dirá qué pedir.",
  },
  {
    id: "entrenamiento",
    name: "Entrenamiento",
    description:
      "Dudas con algún ejercicio: mándame una foto y te explico la técnica, qué no fallar y por cuál sustituirlo.",
    url: "https://chatgpt.com/g/g-6a830314d184819182a93bc2518c45a9-entrenamiento-fitcondamian",
    icon: "🏋️",
    hint: "Se abre en ChatGPT. Para que tu coach revise tu técnica en vídeo, usa «Revisión de técnica».",
  },
  {
    id: "despensa",
    name: "No he ido a la compra",
    description:
      "¿Nevera vacía y ninguna receta del plan a mano? Hazle una foto a lo que tengas y te monto platos equilibrados con eso, sin saltarte el plan.",
    url: "https://chatgpt.com/g/g-6a8d9ea3a3d081919feef151c866c52d-no-he-ido-a-la-compra-solucionalo-con-una-foto",
    icon: "🧊",
    hint: "Se abre en ChatGPT. Foto a la nevera y a la despensa, cuanto más se vea mejor.",
  },
];

export function findTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
