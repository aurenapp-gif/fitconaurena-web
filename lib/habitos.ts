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
