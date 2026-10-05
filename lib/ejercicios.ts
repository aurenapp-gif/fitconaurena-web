/**
 * El catálogo de ejercicios: la pieza sobre la que se apoya todo lo demás.
 *
 * Hasta ahora un ejercicio era un NOMBRE escrito a mano dentro de un PDF. Con
 * eso no se puede enseñar un vídeo, ni ofrecer un sustituto cuando la máquina
 * está ocupada, ni contar series por grupo sin adivinar: `lib/musculos.ts`
 * clasifica por palabras precisamente porque no había catálogo.
 *
 * Aquí cada ejercicio es una ficha con todo dentro, y una planificación pasa a
 * ser una lista de referencias a estas fichas. Esa es la diferencia entre
 * entregar un papel y tener un programa.
 *
 * DÓNDE VIVE CADA COSA. El catálogo de la casa está en el repositorio
 * (`lib/catalogo/`), no en la base de datos: así se revisa en un PR, se puede
 * volver atrás y nadie lo rompe por accidente un domingo. La base de datos
 * guarda una copia para poder buscar y, encima, lo que la coach edite o añada
 * desde la app. Lo editado manda sobre lo del repositorio.
 */

import type { Grupo } from "./musculos";

/** Con qué se hace. Importa para saber si su gimnasio lo tiene. */
export type Material =
  | "maquina" | "polea" | "barra" | "mancuerna"
  | "multipower" | "peso-corporal" | "banda" | "kettlebell";

export const NOMBRE_MATERIAL: Record<Material, string> = {
  maquina: "Máquina",
  polea: "Polea",
  barra: "Barra",
  mancuerna: "Mancuerna",
  multipower: "Multipower",
  "peso-corporal": "Peso corporal",
  banda: "Banda",
  kettlebell: "Kettlebell",
};

/**
 * El patrón de movimiento. No es decoración: es lo que permite decir «te falta
 * una bisagra de cadera» o sustituir un ejercicio por otro que haga el mismo
 * trabajo, que es algo que el grupo muscular por sí solo no dice.
 */
export type Patron =
  | "empuje-cadera" | "rodilla" | "bisagra"
  | "empuje-horizontal" | "empuje-vertical"
  | "traccion-horizontal" | "traccion-vertical"
  | "core" | "aislamiento";

export const NOMBRE_PATRON: Record<Patron, string> = {
  "empuje-cadera": "Empuje de cadera",
  rodilla: "Dominante de rodilla",
  bisagra: "Bisagra de cadera",
  "empuje-horizontal": "Empuje horizontal",
  "empuje-vertical": "Empuje vertical",
  "traccion-horizontal": "Tracción horizontal",
  "traccion-vertical": "Tracción vertical",
  core: "Core",
  aislamiento: "Aislamiento",
};

export type Nivel = "inicia" | "media" | "avanzada";

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  inicia: "Empieza",
  media: "Media",
  avanzada: "Avanzada",
};

/**
 * Por qué se ofrece un sustituto. La clienta no busca «otro ejercicio de
 * glúteo»: busca uno porque la máquina está pillada, porque hoy entrena en
 * casa o porque le molesta la rodilla. El motivo es la mitad de la respuesta.
 */
export type MotivoSustituto =
  | "ocupada" | "sin-maquina" | "casa"
  | "rodilla" | "hombro" | "lumbar"
  | "mas-facil" | "mas-dificil";

export const NOMBRE_MOTIVO: Record<MotivoSustituto, string> = {
  ocupada: "Si está ocupada",
  "sin-maquina": "Si tu gimnasio no la tiene",
  casa: "En casa",
  rodilla: "Si molesta la rodilla",
  hombro: "Si molesta el hombro",
  lumbar: "Si molesta la zona lumbar",
  "mas-facil": "Más fácil",
  "mas-dificil": "Más difícil",
};

export type Sustituto = { id: string; motivo: MotivoSustituto };

/**
 * De dónde sale la imagen de arranque.
 *
 * Las primeras imágenes vienen de wger, que las publica con licencia Creative
 * Commons. Esa licencia OBLIGA a decir de quién es cada una, así que el autor
 * y la licencia viajan con la imagen y se pintan debajo. El día que se graben
 * las nuestras, este campo se queda a null y no hay nada que atribuir.
 */
export type ImagenLibre = {
  /** Dónde está guardada en nuestro almacenamiento. */
  path: string;
  autor: string;
  licencia: string;
  /** La página de origen, para poder enlazarla. */
  fuente: string;
};

export type Ejercicio = {
  /** Identificador estable; se usa en la URL, en los planes y en los sustitutos. */
  id: string;
  nombre: string;
  /** Cómo lo llama cada una. Sirve para buscar y para casar planes antiguos. */
  alias: string[];
  grupo: Grupo;
  secundarios: Grupo[];
  material: Material;
  patron: Patron;
  nivel: Nivel;
  /** Cómo se hace, paso a paso. */
  pasos: string[];
  /** Cómo dejar la máquina puesta. Vacío si no hay máquina que ajustar. */
  ajuste: string[];
  errores: string[];
  /** Cómo saber que va bien: qué se nota y qué no se debería notar. */
  senales: string;
  /** Cuándo tener cuidado. null si no hay nada que avisar. */
  cuidado: string | null;
  sustitutos: Sustituto[];
  imagen: ImagenLibre | null;
  /** Identificador de YouTube, cuando se graben los vídeos de la casa. */
  video: string | null;
};

/* ------------------------------------------------------------------ *
 * Comprobaciones
 * ------------------------------------------------------------------ */

/** Quita tildes y mayúsculas, para buscar como se escribe con prisa. */
export function normaliza(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** ¿Encaja este ejercicio con lo que se ha escrito en el buscador? */
export function coincide(e: Ejercicio, termino: string): boolean {
  const t = normaliza(termino);
  if (!t) return true;
  return [e.nombre, ...e.alias].some((n) => normaliza(n).includes(t));
}

/**
 * Qué le falta a una ficha para estar completa.
 *
 * Se usa en la pantalla del catálogo para que se vea de un vistazo qué queda
 * por rematar, y en las pruebas para que no entre una ficha a medias. Una
 * ficha incompleta es exactamente el PDF cutre del que venimos.
 */
export function loQueFalta(e: Ejercicio): string[] {
  const falta: string[] = [];
  if (e.pasos.length < 3) falta.push("cómo se hace");
  if (!e.errores.length) falta.push("errores típicos");
  if (!e.senales.trim()) falta.push("cómo saber que va bien");
  if (!e.sustitutos.length) falta.push("sustitutos");
  if (necesitaAjuste(e) && !e.ajuste.length) falta.push("ajuste de la máquina");
  if (!e.imagen && !e.video) falta.push("imagen o vídeo");
  return falta;
}

/** Lo que se ajusta antes de empezar: asiento, respaldo, almohadilla, polea. */
export function necesitaAjuste(e: Ejercicio): boolean {
  return e.material === "maquina" || e.material === "polea" || e.material === "multipower";
}
