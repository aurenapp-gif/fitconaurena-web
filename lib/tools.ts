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
];

export function findTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
