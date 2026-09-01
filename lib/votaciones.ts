/**
 * Votaciones dentro de un comunicado.
 *
 * Sin dependencias de servidor: los componentes cliente también lo importan.
 */

export const MAX_OPCIONES = 4;
export const MIN_OPCIONES = 2;
export const MAX_LARGO_OPCION = 60;

/** Lo que se propone por defecto al marcar «permitir votar». */
export const OPCIONES_POR_DEFECTO = ["Sí", "No"];

export type Voto = { member_email: string; option_index: number };

/**
 * Limpia las opciones que llegan del formulario o de la base.
 *
 * Devuelve null si no valen: menos de dos opciones con texto, o algo que no es
 * una lista. Null significa «comunicado sin votación», que es justo lo que hay
 * que guardar cuando la coach no marca la casilla.
 */
export function sanearOpciones(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const limpias: string[] = [];
  for (const o of v) {
    if (typeof o !== "string") continue;
    const t = o.trim().slice(0, MAX_LARGO_OPCION);
    // Repetidas no: dos botones iguales no se pueden distinguir al votar.
    if (t && !limpias.includes(t)) limpias.push(t);
    if (limpias.length === MAX_OPCIONES) break;
  }
  return limpias.length >= MIN_OPCIONES ? limpias : null;
}

export type Recuento = {
  opcion: string;
  indice: number;
  votos: number;
  /** Porcentaje redondeado sobre el total de votos emitidos. */
  pct: number;
  /** Quién ha votado esto (solo se le enseña a la coach). */
  quienes: string[];
};

/**
 * Recuento por opción.
 *
 * Los votos a opciones que ya no existen —porque se editaron después— se
 * descartan en vez de reventar: más vale un recuento honesto de lo que sigue
 * en pie que un error en pantalla.
 */
export function recuento(
  opciones: string[],
  votos: Voto[],
  nombre: (email: string) => string = (e) => e
): { filas: Recuento[]; total: number } {
  const validos = votos.filter((v) => v.option_index >= 0 && v.option_index < opciones.length);
  const total = validos.length;
  const filas = opciones.map((opcion, indice) => {
    const suyos = validos.filter((v) => v.option_index === indice);
    return {
      opcion,
      indice,
      votos: suyos.length,
      pct: total === 0 ? 0 : Math.round((suyos.length / total) * 100),
      quienes: suyos.map((v) => nombre(v.member_email)).sort((a, b) => a.localeCompare(b, "es")),
    };
  });
  return { filas, total };
}

/** Qué votó esta clienta, o null si aún no ha votado. */
export function miVoto(votos: Voto[], email: string): number | null {
  const v = votos.find((x) => x.member_email === email);
  return v ? v.option_index : null;
}
