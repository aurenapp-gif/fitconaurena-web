/**
 * La videollamada grupal: todos los jueves a las 17:30, hora de Madrid.
 *
 * Sin dependencias de servidor: lo usan componentes cliente, que necesitan
 * recalcularlo cada segundo para la cuenta atrás.
 */

/** Desfase de Madrid respecto a UTC (en ms) en un instante dado.
 *
 * Se obtiene leyendo la hora de pared de Madrid con `formatToParts` y
 * comparándola con la de UTC. Es importante NO parsear una fecha con
 * `new Date(cadena)`: eso la interpreta en la zona horaria del móvil de quien
 * mira, y la cuenta atrás salía desplazada (en España marcaba las 19:30 en vez
 * de las 17:30). Así el resultado es el mismo se mire desde donde se mire. */
function madridOffset(at: number): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(at));
  const g = (t: string) => +p.find((x) => x.type === t)!.value;
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - at;
}

function madridWallToUTC(y: number, m: number, d: number, h: number, min: number): number {
  const wall = Date.UTC(y, m - 1, d, h, min);
  // Dos pasadas: la primera estima el desfase y la segunda lo corrige si el
  // cambio de hora (marzo/octubre) cae justo entre medias.
  let ts = wall - madridOffset(wall);
  ts = wall - madridOffset(ts);
  return ts;
}

/** Cuánto dura la llamada: hasta entonces sigue contando como «en directo». */
export const DURACION_MS = 2 * 3600000;

/** Próximo jueves a las 17:30 (hora de Madrid), como timestamp. Sigue siendo
 * «esta» hasta dos horas después de empezar. */
export function proximaLlamada(now: number): number {
  for (let i = 0; i < 14; i++) {
    const base = new Date(now + i * 86400000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(base);
    const get = (t: string) => parts.find((x) => x.type === t)!.value;
    if (get("weekday") !== "Thu") continue;
    const t = madridWallToUTC(+get("year"), +get("month"), +get("day"), 17, 30);
    if (t > now - DURACION_MS) return t;
  }
  return now;
}

/** «Jueves 11 de septiembre», en horario de Madrid. */
export function diaLlamada(ts: number): string {
  const s = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(new Date(ts));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Frase corta con lo que falta: «en 6 días», «hoy a las 17:30», «en 2 h». */
export function faltaPara(ts: number, now: number): string {
  const diff = ts - now;
  if (diff <= 0) return "en directo";
  const dias = Math.floor(diff / 86400000);
  if (dias >= 1) return `en ${dias} ${dias === 1 ? "día" : "días"}`;
  const horas = Math.floor(diff / 3600000);
  if (horas >= 1) return `en ${horas} h`;
  const min = Math.max(1, Math.floor(diff / 60000));
  return `en ${min} min`;
}
