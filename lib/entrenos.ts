/**
 * El entreno que ella apunta, serie a serie.
 *
 * Antes los pesos se escribían de memoria cada quince días, al rellenar la
 * revisión. Aquí se apuntan mientras entrena, y con eso se puede responder a
 * la única pregunta que importa delante de una máquina: «¿cuánto levanté la
 * última vez?».
 *
 * De aquí no sale nada que no esté filtrado por el correo de quien pregunta.
 * Es la razón de que `member_email` esté también en cada serie y no solo en la
 * sesión: una consulta mal escrita devuelve cero filas en vez del peso de otra.
 */

export type SerieGuardada = {
  ejercicio: string;
  serie: number;
  peso: number | null;
  reps: number | null;
  created_at: string;
};

export type UltimaVez = {
  /** La carga más alta de aquel día. Es la que se recuerda. */
  peso: number | null;
  reps: number | null;
  /** Cuántas series hizo. */
  series: number;
  /** Fecha (ISO) de aquella sesión. */
  cuando: string;
};

/** Tope de peso: 999,99 kg. Por encima es un dedazo, no un récord. */
export const PESO_MAX = 999.99;
export const REPS_MAX = 999;

/**
 * Un peso que se pueda guardar, o null.
 *
 * Acepta coma decimal porque en un móvil español el teclado numérico da coma,
 * y porque los discos van de 2,5 en 2,5. Un cero es «no lo apunté», no «cero
 * kilos»: sirve para el peso corporal, donde la carga no aplica.
 */
export function pesoValido(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > PESO_MAX) return null;
  return Math.round(n * 100) / 100;
}

/** Unas repeticiones que se puedan guardar, o null. */
export function repsValidas(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > REPS_MAX) return null;
  return n;
}

/** El número de serie: de la 1 a la 20. Más de veinte no es una sesión. */
export function serieValida(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : null;
}

/**
 * Los ejercicios se identifican por su nombre, que es lo que ella ve en su
 * plan. Se compara sin mayúsculas ni acentos para que «Sentadilla» y
 * «sentadilla» sean el mismo ejercicio entre un bloque y el siguiente, pero se
 * guarda y se enseña el nombre original.
 */
export function claveEjercicio(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Qué hizo la última vez en cada ejercicio.
 *
 * `series` llega ordenado de lo más reciente a lo más antiguo y ya filtrado
 * por su correo. Para cada ejercicio se toma la sesión más reciente EN LA QUE
 * APUNTÓ ALGO y se devuelve su serie más pesada: es lo que alguien recuerda de
 * un entreno, no la media ni la última serie (que suele ser la floja).
 *
 * @param excluir  sesión que no cuenta. Es la de hoy: comparar el entreno de
 *                 hoy consigo mismo no dice nada.
 */
export function ultimaVezPorEjercicio(
  series: (SerieGuardada & { session_id?: string })[],
  excluir?: string | null
): Map<string, UltimaVez> {
  const out = new Map<string, UltimaVez>();
  /** Para cada ejercicio, de qué día se están recogiendo las series. */
  const dia = new Map<string, string>();

  for (const s of series) {
    if (excluir && s.session_id === excluir) continue;
    const k = claveEjercicio(s.ejercicio);
    if (!k) continue;
    const suDia = s.created_at.slice(0, 10);
    const yaCogido = dia.get(k);
    if (yaCogido && yaCogido !== suDia) continue; // de un día más antiguo: ya tenemos el suyo
    if (!yaCogido) dia.set(k, suDia);

    const previo = out.get(k);
    const masPesada = previo === undefined || (s.peso ?? -1) > (previo.peso ?? -1);
    out.set(k, {
      peso: masPesada ? s.peso : previo.peso,
      reps: masPesada ? s.reps : previo.reps,
      series: (previo?.series ?? 0) + 1,
      cuando: previo?.cuando ?? s.created_at,
    });
  }
  return out;
}

export type Comparacion = {
  /** Kilos de diferencia. null si no hay con qué comparar. */
  delta: number | null;
  /** «+2,5 kg», «igual», «−5 kg», «nuevo». */
  texto: string;
  sentido: "sube" | "igual" | "baja" | "nuevo";
};

/** Cómo va hoy respecto a la última vez, en ese ejercicio. */
export function compara(hoy: number | null, antes: number | null | undefined): Comparacion {
  if (hoy === null || antes === null || antes === undefined) {
    return { delta: null, texto: "nuevo", sentido: "nuevo" };
  }
  const d = Math.round((hoy - antes) * 100) / 100;
  if (Math.abs(d) < 0.01) return { delta: 0, texto: "igual", sentido: "igual" };
  const kg = Math.abs(d).toLocaleString("es-ES", { maximumFractionDigits: 2 });
  return d > 0
    ? { delta: d, texto: `+${kg} kg`, sentido: "sube" }
    : { delta: d, texto: `−${kg} kg`, sentido: "baja" };
}

/** «42,5 kg» — con coma, que es como se lee aquí. */
export function textoPeso(peso: number | null): string {
  return peso === null ? "—" : `${peso.toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg`;
}

/** «4×8 con 42,5 kg» para el resumen de un ejercicio. */
export function textoUltimaVez(u: UltimaVez): string {
  const carga = u.peso !== null ? ` con ${textoPeso(u.peso)}` : "";
  return `${u.series}×${u.reps ?? "?"}${carga}`;
}

/**
 * El descanso del plan, en segundos.
 *
 * Viene escrito como lo escribió la coach: «90 s», «90"», «2 min», «1:30».
 * Si no se entiende se devuelve null y no se enseña cuenta atrás, que es mejor
 * que enseñar una mal contada: entre serie y serie nadie va a comprobarla.
 */
export function segundosDescanso(texto: string | null): number | null {
  if (!texto) return null;
  const t = texto.toLowerCase().replace(",", ".").trim();

  const reloj = t.match(/^(\d{1,2}):([0-5]\d)$/);
  if (reloj) return Number(reloj[1]) * 60 + Number(reloj[2]);

  const n = t.match(/(\d+(?:\.\d+)?)/);
  if (!n) return null;
  const v = Number(n[1]);
  if (!Number.isFinite(v) || v <= 0) return null;

  const enMinutos = /min|'|\bm\b/.test(t) && !/seg|["s]\b/.test(t);
  const s = Math.round(enMinutos ? v * 60 : v);
  // Menos de cinco segundos o más de diez minutos no es un descanso entre
  // series: será otra cosa escrita en esa casilla.
  return s >= 5 && s <= 600 ? s : null;
}

/** Cuánto duró la sesión, redondeado a minutos: «48 min», «1 h 12 min». */
export function duracion(inicio: string, fin: string): string {
  const min = Math.max(0, Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
