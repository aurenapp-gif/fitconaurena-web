/**
 * Revisiones (check-ins) en fechas fijas: día 1 y día 15 de cada mes.
 *
 * Antes cada clienta tenía su propio ciclo, contando quince días desde la
 * última que hizo, y acababan repartidas por todo el calendario. Ahora todas
 * caen el mismo día: la coach las compara de una sentada en vez de ir mirándolas
 * de una en una.
 *
 * Todo se calcula en horario de Madrid: si no, entre las 00:00 y las 02:00 el
 * servidor (UTC) creería que aún es el día anterior y el día 1 empezaría tarde.
 *
 * Sin dependencias de servidor: los componentes cliente también lo importan.
 */

/** Días del mes en que toca subir la revisión. */
export const REVIEW_DAYS = [1, 15] as const;

/** Hoy en Madrid, como YYYY-MM-DD. */
export function todayMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);
}

export type Periodo = {
  /** Día en que empezó y en que tocaba subirla (YYYY-MM-DD). */
  inicio: string;
  /** Cuántos días han pasado desde ese día. 0 = hoy toca. */
  dia: number;
  /** «1 de septiembre», para los textos. */
  etiqueta: string;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * Periodo de revisión al que pertenece un día.
 *
 * Del 1 al 14 → el periodo que arrancó el día 1. Del 15 en adelante → el que
 * arrancó el 15. Así cada revisión pertenece sin ambigüedad a una quincena.
 */
export function periodoDe(dia: string): Periodo {
  const [y, m, d] = dia.split("-").map(Number);
  const inicioDia = d >= 15 ? 15 : 1;
  const inicio = `${y}-${String(m).padStart(2, "0")}-${String(inicioDia).padStart(2, "0")}`;
  return {
    inicio,
    dia: d - inicioDia,
    etiqueta: `${inicioDia} de ${MESES[m - 1]}`,
  };
}

/**
 * Días del periodo en que se avisa a quien todavía no la ha subido.
 *
 *   0 → el propio día 1 o 15: «hoy toca».
 *   2 → un empujón a los dos días.
 *   5 → el último aviso, ya con más urgencia.
 *
 * Tres correos por quincena como mucho. Insistir más no la va a convencer y sí
 * consigue que marque el remitente como spam, y entonces deja de llegarle todo
 * lo demás.
 */
export const DIAS_AVISO = [0, 2, 5] as const;

/** ¿Toca avisar hoy a quien no la ha subido? */
export function tocaAvisar(p: Periodo): boolean {
  return (DIAS_AVISO as readonly number[]).includes(p.dia);
}

/** Qué decirle según lo que se haya retrasado. */
export function textoAviso(p: Periodo): { subject: string; heading: string; message: string } {
  if (p.dia === 0) {
    return {
      subject: "📸 Hoy toca tu revisión",
      heading: "Hoy toca tu revisión 📸",
      message: "Las revisiones son el día 1 y el día 15 de cada mes, y hoy es uno de esos días. Sube tu peso y tus 3 fotos (frente, perfil y espaldas).",
    };
  }
  if (p.dia === 2) {
    return {
      subject: "📸 Te falta la revisión del " + p.etiqueta,
      heading: "Aún te falta tu revisión 📸",
      message: `La revisión del ${p.etiqueta} sigue sin subir. Es un minuto: peso y tus 3 fotos. Sin ella tu coach no puede ajustarte el plan.`,
    };
  }
  return {
    subject: "📸 Último aviso: revisión del " + p.etiqueta,
    heading: "Último aviso de tu revisión 📸",
    message: `Llevas ${p.dia} días sin subir la revisión del ${p.etiqueta}. Súbela hoy para que tu coach pueda ver cómo vas y ajustarte lo que haga falta.`,
  };
}

/**
 * Días del periodo en que la coach recibe el parte de quién falta.
 *
 * El 3 (ya han tenido margen de sobra y aún queda quincena para reaccionar) y
 * el 8 (a mitad, para quien siga sin hacerla). En el día 0 no tiene sentido:
 * aún no ha faltado nadie.
 */
export const DIAS_PARTE_COACH = [3, 8] as const;

export function tocaParteCoach(p: Periodo): boolean {
  return (DIAS_PARTE_COACH as readonly number[]).includes(p.dia);
}

/**
 * Cuándo le toca a la clienta la siguiente revisión, para la pantalla de
 * inicio.
 *
 * Si la de esta quincena está sin subir, la «próxima» es esa misma: aunque
 * hayan pasado unos días del 1 o del 15, sigue siendo la que toca. Si ya la
 * subió, la siguiente fecha fija: el 15 de este mes o el 1 del que viene.
 */
export function proximaRevision(hoy: string, hechaEstaQuincena: boolean): { fecha: string; dias: number; pendiente: boolean } {
  const p = periodoDe(hoy);
  if (!hechaEstaQuincena) return { fecha: p.inicio, dias: 0, pendiente: true };
  const [y, m, d] = hoy.split("-").map(Number);
  const fecha = d < 15
    ? `${y}-${String(m).padStart(2, "0")}-15`
    : m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const ms = Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)) - Date.UTC(y, m - 1, d);
  return { fecha, dias: Math.round(ms / 86400000), pendiente: false };
}

/** Texto de la norma, para no repetirlo por media app. */
export const NORMA = "Las revisiones se suben el día 1 y el día 15 de cada mes.";
