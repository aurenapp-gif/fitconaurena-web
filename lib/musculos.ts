/**
 * De qué grupo muscular es cada ejercicio.
 *
 * Hace falta para contar series por grupo y semana, que es lo que dice si el
 * estímulo se queda corto. Se hace por palabras del nombre porque los nombres
 * los escribe la coach a mano en cada plan y no hay catálogo: «Hip thrust»,
 * «hip thrust barra», «HIP THRUST 4x12» tienen que caer en el mismo sitio.
 *
 * Un ejercicio que no se reconoce NO se reparte a ojo: se queda en «sin
 * clasificar» y se dice. Contar series en el grupo equivocado es peor que no
 * contarlas.
 */

export type Grupo =
  | "gluteo" | "cuadriceps" | "femoral" | "espalda"
  | "pecho" | "hombro" | "brazo" | "core" | "gemelo";

export const NOMBRE_GRUPO: Record<Grupo, string> = {
  gluteo: "Glúteo",
  cuadriceps: "Cuádriceps",
  femoral: "Isquios y femoral",
  espalda: "Espalda",
  pecho: "Pecho",
  hombro: "Hombro",
  brazo: "Brazo",
  core: "Core",
  gemelo: "Gemelo",
};

/**
 * Palabras que identifican cada grupo, de la más específica a la más general.
 * El orden importa, y no es un detalle: «peso muerto rumano» es femoral, y hay
 * que verlo antes de que «peso muerto» lo mande a espalda; «gemelos en
 * prensa» es gemelo, y hay que verlo antes de que «prensa» lo mande a
 * cuádriceps (que es lo que pasaba, y el analizador contaba esas series en el
 * grupo equivocado).
 */
const REGLAS: ReadonlyArray<{ grupo: Grupo; patrones: RegExp }> = [
  { grupo: "femoral", patrones: /rumano|femoral|isquio|curl tumbad|curl de pierna|buenos dias|good morning/ },
  { grupo: "gluteo", patrones: /hip thrust|empuje de cadera|puente de gluteo|gluteo|patada|abduct|coz|kickback/ },
  { grupo: "gemelo", patrones: /gemelo|soleo|calf|elevacion de talon/ },
  { grupo: "cuadriceps", patrones: /sentadilla|squat|prensa|leg press|zancada|lunge|bulgar|extension de cuadriceps|extension de pierna|step ?up|subida al cajon|hack/ },
  { grupo: "espalda", patrones: /jalon|dominada|pull ?up|pull ?over|remo|row|peso muerto|deadlift|face ?pull|encogimiento de hombro|trapecio/ },
  { grupo: "pecho", patrones: /press de banca|press banca|press inclinado|press plano|press declinado|aperturas|pec ?deck|contractora|fondo|push ?up|flexion/ },
  { grupo: "hombro", patrones: /press militar|press de hombro|press hombro|elevacion lateral|elevacion frontal|deltoid|hombro|arnold/ },
  { grupo: "brazo", patrones: /biceps|curl|martillo|triceps|frances|copa|extension de codo|patada de triceps/ },
  { grupo: "core", patrones: /abdominal|plancha|plank|crunch|core|oblicuo|elevacion de piernas|rueda|ab ?wheel|pallof/ },
];

/** Quita tildes y sobra, para que «Elevación» y «elevacion» sean lo mismo. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** El grupo de un ejercicio, o `null` si no se reconoce. */
export function grupoDe(nombre: string): Grupo | null {
  const n = normalizarNombre(nombre);
  if (!n) return null;
  for (const r of REGLAS) if (r.patrones.test(n)) return r.grupo;
  return null;
}

/**
 * Series por grupo muscular, contando una serie entera en su grupo.
 *
 * No se reparten fracciones entre grupos ayudantes: para decidir si a una
 * clienta le faltan series de glúteo, lo que importa es lo que ha hecho de
 * glúteo, y repartir medio punto a la espalda por cada peso muerto solo
 * enturbia el número que se le va a enseñar.
 */
export function seriesPorGrupo(
  series: { ejercicio: string }[]
): { porGrupo: Map<Grupo, number>; sinClasificar: string[] } {
  const porGrupo = new Map<Grupo, number>();
  const sinClasificar = new Set<string>();
  for (const s of series) {
    const g = grupoDe(s.ejercicio);
    if (!g) { sinClasificar.add(s.ejercicio.trim()); continue; }
    porGrupo.set(g, (porGrupo.get(g) ?? 0) + 1);
  }
  return { porGrupo, sinClasificar: Array.from(sinClasificar).sort() };
}
