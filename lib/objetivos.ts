/**
 * El objetivo de facturación del mes.
 *
 * Un número en la pared cambia cómo se trabaja: no es lo mismo «llevamos
 * 1.897 €» que «nos faltan 28.103 €, o sea dieciocho clientas, y quedan
 * veintiséis días». Lo segundo se puede convertir en una decisión hoy; lo
 * primero solo se mira.
 *
 * Se guarda en los ajustes (`app_settings`), uno por mes, para no tener que
 * crear una tabla para guardar un número al mes. La clave lleva el mes dentro
 * («objetivo:2026-10»), así que cada mes conserva el suyo y el histórico queda.
 */

import { guardarAjuste, leerAjuste } from "./ajustes";

export const claveObjetivo = (mes: string) => `objetivo:${mes}`;

/**
 * El precio mínimo de un contrato, en céntimos.
 *
 * Es el suelo: a partir de ahora nadie entra por menos. Sirve para traducir
 * «faltan 28.000 €» en «faltan N clientas», que es la cuenta que de verdad se
 * hace. Se guarda en los ajustes para poder subirlo sin tocar código.
 */
export const AJUSTE_TICKET_MINIMO = "ticket_minimo";
export const TICKET_MINIMO_POR_DEFECTO = 179_700;

export async function ticketMinimo(): Promise<number> {
  const v = await leerAjuste(AJUSTE_TICKET_MINIMO);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : TICKET_MINIMO_POR_DEFECTO;
}

export async function guardarTicketMinimo(centimos: number, por: string): Promise<void> {
  await guardarAjuste(AJUSTE_TICKET_MINIMO, String(Math.round(centimos)), por);
}

/**
 * Con qué ticket se calcula lo que falta.
 *
 * El mayor de los dos: el mínimo que se cobra ahora y lo que se está cobrando
 * de media últimamente. El histórico arrastra contratos viejos más baratos y
 * haría pensar que hacen falta más clientas de las que hacen falta; y si de
 * hecho se está vendiendo por encima del mínimo, esa es la cuenta buena.
 */
export function ticketDePrevision(minimo: number, medioReciente: number | null): number {
  return Math.max(minimo, medioReciente ?? 0);
}

/** El objetivo del mes en CÉNTIMOS, o null si no se ha puesto ninguno. */
export async function objetivoDelMes(mes: string): Promise<number | null> {
  const v = await leerAjuste(claveObjetivo(mes));
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export async function guardarObjetivo(mes: string, centimos: number | null, por: string): Promise<void> {
  await guardarAjuste(claveObjetivo(mes), centimos && centimos > 0 ? String(Math.round(centimos)) : null, por);
}

export type Progreso = {
  objetivo: number;
  facturado: number;
  /** Lo que se facturó el mes pasado. Es el listón que de verdad se defiende. */
  anterior: number;
  /** Dónde cae ese listón en la barra, de 0 a 100. */
  pctAnterior: number;
  /** Lo que falta para superarlo. 0 si ya está superado. */
  faltaAnterior: number;
  /** Cuántas clientas más para superarlo, al ticket medio. */
  clientasAnterior: number | null;
  /** De 0 a 100, ya recortado: una barra no pasa del final. */
  pct: number;
  /** Lo que falta para llegar. 0 si ya está. */
  falta: number;
  /** Cuántas clientas más al ticket medio. null si no hay con qué calcularlo. */
  clientas: number | null;
  ticketMedio: number | null;
  /** Días que quedan del mes, contando hoy. */
  diasRestantes: number;
  /** Lo que habría que facturar cada día que queda. */
  porDia: number;
  /** A dónde llega el mes si sigue el ritmo de lo que va de mes. */
  proyeccion: number;
};

/** Cuántos días tiene un mes «2026-10». */
export function diasDelMes(mes: string): number {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/**
 * Cómo va el mes.
 *
 * `hoy` llega en formato ISO («2026-10-06») y en horario de Madrid: el día que
 * cuenta es el de aquí, no el del servidor.
 */
/**
 * Cómo va el mes, contra DOS listones.
 *
 * El objetivo es a lo que se aspira; superar el mes anterior es lo que no se
 * puede perder. Son cosas distintas y por eso se enseñan las dos: un mes puede
 * quedarse lejos del objetivo y aun así ser el mejor de la historia del
 * negocio, y eso hay que saberlo el día que pasa, no en la reunión de enero.
 */
export function progresoDelObjetivo(
  objetivo: number,
  facturado: number,
  ticketMedio: number | null,
  mes: string,
  hoy: string,
  anterior = 0
): Progreso {
  const total = diasDelMes(mes);
  const mesDeHoy = hoy.slice(0, 7);
  // Hoy cuenta como día que queda: todavía se puede firmar esta tarde. Un mes
  // que ya pasó no deja ninguno, y uno que no ha empezado los deja todos.
  const enCurso = mesDeHoy === mes;
  const dia = enCurso ? Number(hoy.slice(8, 10)) : mesDeHoy > mes ? total : 0;
  const diasRestantes = mesDeHoy > mes ? 0 : enCurso ? Math.max(0, total - dia + 1) : total;
  const transcurridos = Math.max(1, dia);

  const falta = Math.max(0, objetivo - facturado);
  const cuantas = (cuanto: number) =>
    cuanto <= 0 ? 0 : ticketMedio && ticketMedio > 0 ? Math.ceil(cuanto / ticketMedio) : null;
  const faltaAnterior = Math.max(0, anterior - facturado);

  return {
    objetivo,
    facturado,
    anterior,
    // Si el mes anterior fue MEJOR que el objetivo, la marca se queda al
    // final: la barra no puede pintar algo que se sale de ella.
    pctAnterior: objetivo > 0 ? Math.min(100, Math.round((anterior / objetivo) * 100)) : 0,
    faltaAnterior,
    clientasAnterior: cuantas(faltaAnterior),
    pct: objetivo > 0 ? Math.min(100, Math.round((facturado / objetivo) * 100)) : 0,
    falta,
    clientas: cuantas(falta),
    ticketMedio,
    diasRestantes,
    porDia: diasRestantes > 0 ? Math.round(falta / diasRestantes) : falta,
    proyeccion: Math.round((facturado / transcurridos) * total),
  };
}

/**
 * El ticket medio con el que se calcula «cuántas clientas faltan».
 *
 * Se mira lo vendido en los últimos 90 días y no todo el histórico: los
 * precios suben, y dividir por el ticket de hace un año da una cuenta que no
 * se cumple. Si en 90 días no hay nada, se usa todo lo que haya.
 */
export function ticketMedioReciente(
  ventas: { importe_cent: number; fecha: string }[],
  hoy: string,
  dias = 90
): number | null {
  if (ventas.length === 0) return null;
  const desde = new Date(hoy + "T00:00:00Z");
  desde.setUTCDate(desde.getUTCDate() - dias);
  const corte = desde.toISOString().slice(0, 10);
  const recientes = ventas.filter((v) => v.fecha >= corte);
  const base = recientes.length > 0 ? recientes : ventas;
  const suma = base.reduce((n, v) => n + v.importe_cent, 0);
  return base.length > 0 ? Math.round(suma / base.length) : null;
}
