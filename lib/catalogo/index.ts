/**
 * El catálogo de la casa, junto.
 *
 * Vive en el repositorio y no en la base de datos a propósito: así cada
 * cambio pasa por un PR, se puede volver atrás y las pruebas comprueban que
 * ninguna ficha entra a medias ni apunta a un sustituto que no existe.
 */

import type { Ejercicio } from "../ejercicios";
import { coincide } from "../ejercicios";
import type { Grupo } from "../musculos";
import { INFERIOR } from "./inferior";
import { INFERIOR_2 } from "./inferior2";
import { SUPERIOR } from "./superior";
import { SUPERIOR_2 } from "./superior2";

export const CATALOGO: Ejercicio[] = [...INFERIOR, ...INFERIOR_2, ...SUPERIOR, ...SUPERIOR_2];

const POR_ID = new Map(CATALOGO.map((e) => [e.id, e]));

export function ejercicioPorId(id: string): Ejercicio | null {
  return POR_ID.get(id) ?? null;
}

export function ejerciciosDeGrupo(grupo: Grupo): Ejercicio[] {
  return CATALOGO.filter((e) => e.grupo === grupo);
}

/** Buscar por nombre o por cualquiera de sus alias. */
export function buscarEjercicios(termino: string): Ejercicio[] {
  return CATALOGO.filter((e) => coincide(e, termino));
}

/**
 * Casar el nombre escrito a mano en un plan antiguo con una ficha del
 * catálogo. Los planes viejos siguen siendo texto; si el nombre coincide con
 * una ficha, la clienta gana el vídeo y el sustituto sin tener que resubir
 * nada.
 */
export function fichaDeNombre(nombre: string): Ejercicio | null {
  const encontrados = buscarEjercicios(nombre);
  if (encontrados.length === 1) return encontrados[0];
  // Con varias coincidencias, se queda la del nombre más parecido en longitud:
  // «curl femoral» no puede acabar en «curl de bíceps con mancuernas».
  const exacto = encontrados.find(
    (e) => e.nombre.toLowerCase() === nombre.trim().toLowerCase()
      || e.alias.some((a) => a.toLowerCase() === nombre.trim().toLowerCase())
  );
  return exacto ?? null;
}
