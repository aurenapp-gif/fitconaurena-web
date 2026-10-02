/**
 * Hábitos diarios: agua, pasos, sueño, y desde el rediseño «para ellas»,
 * ciclo y energía. Utilidades compartidas entre la portada, el perfil y el
 * registro. Sin dependencias de servidor.
 */

/** Litros que es un vaso. El agua se guarda en vasos (enteros) desde el
 * principio; en pantalla se enseña en litros, que es como lo pauta la coach.
 * Un paso del contador = un vaso = 0,25 L. */
export const LITROS_POR_VASO = 0.25;

export function litrosDeVasos(vasos: number): number {
  return Math.round(vasos * LITROS_POR_VASO * 100) / 100;
}

/** «1,25 L», con coma y sin ceros de sobra. */
export function textoLitros(l: number): string {
  return `${l.toLocaleString("es-ES", { maximumFractionDigits: 2 })} L`;
}

export type DiaSemana = { label: string; done: boolean; hoy: boolean; futuro: boolean; fecha: string };

/** Lunes a domingo de la semana en curso, marcando los días con registro. */
export function semanaDe(today: string, registrados: Set<string>): DiaSemana[] {
  const d = new Date(today + "T00:00:00Z");
  const lunes = new Date(d);
  lunes.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return ["L", "M", "X", "J", "V", "S", "D"].map((label, i) => {
    const x = new Date(lunes);
    x.setUTCDate(lunes.getUTCDate() + i);
    const fecha = x.toISOString().slice(0, 10);
    return { label, done: registrados.has(fecha), hoy: fecha === today, futuro: fecha > today, fecha };
  });
}

/** Días seguidos con registro, contando hacia atrás desde hoy. Si hoy aún no
 * se ha apuntado, empieza desde ayer para no romper la racha. */
export function rachaDias(registrados: Set<string>, today: string): number {
  let racha = 0;
  const d = new Date(today + "T00:00:00Z");
  if (!registrados.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (registrados.has(d.toISOString().slice(0, 10))) {
    racha++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return racha;
}

/** Los cinco niveles de energía, del 1 al 5. */
export const ENERGIA = ["Floja", "Regular", "Bien", "Muy bien", "A tope"] as const;
export function textoEnergia(n: number | null | undefined): string | null {
  if (n == null || n < 1 || n > 5) return null;
  return ENERGIA[Math.round(n) - 1];
}

/** Día del ciclo válido (1–45) o null. */
export function parseDiaCiclo(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 45 ? n : null;
}

/** Cuántos días atrás se puede apuntar. Una semana: lo que se recuerda de verdad. */
export const DIAS_ATRAS = 6;

export type DiaApuntable = {
  fecha: string;
  /** «Hoy», «Ayer», «Sábado». */
  etiqueta: string;
  /** Ya tiene algo apuntado. */
  done: boolean;
};

const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Los días que puede rellenar: hoy y los seis anteriores, del más antiguo al
 * más reciente.
 *
 * Se cuenta hacia atrás desde hoy y no por semana natural a propósito: un
 * lunes, lo que se le ha pasado es el domingo, y con la semana natural ese día
 * ya no se podría tocar.
 */
export function diasApuntables(hoy: string, registrados: Set<string>, atras = DIAS_ATRAS): DiaApuntable[] {
  const base = new Date(`${hoy}T00:00:00Z`);
  const out: DiaApuntable[] = [];
  for (let i = atras; i >= 0; i--) {
    const x = new Date(base);
    x.setUTCDate(base.getUTCDate() - i);
    const fecha = x.toISOString().slice(0, 10);
    const etiqueta = i === 0 ? "Hoy" : i === 1 ? "Ayer" : DIAS_LARGOS[x.getUTCDay()];
    out.push({ fecha, etiqueta, done: registrados.has(fecha) });
  }
  return out;
}

/** ¿Se puede apuntar ese día? Ni en el futuro ni más allá de la semana. */
export function sePuedeApuntar(dia: string, hoy: string, atras = DIAS_ATRAS): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const d = Date.parse(`${dia}T00:00:00Z`);
  const h = Date.parse(`${hoy}T00:00:00Z`);
  if (!Number.isFinite(d) || !Number.isFinite(h)) return false;
  const diferencia = Math.round((h - d) / 86400000);
  return diferencia >= 0 && diferencia <= atras;
}
