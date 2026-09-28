/**
 * Las cuentas: lo facturado y lo cobrado.
 *
 * Todo el dinero viaja en CÉNTIMOS y en entero. Un 0,1 + 0,2 en coma flotante
 * no da 0,3, y sumando doscientos cobros eso acaba en un descuadre de
 * céntimos que no hay forma de explicar. En céntimos, 250050 es 250050.
 */

export type Venta = {
  id: string;
  member_email: string;
  concepto: string | null;
  importe_cent: number;
  fecha: string;
  metodo: string | null;
  nota: string | null;
};

export type Cobro = {
  id: string;
  member_email: string;
  venta_id: string | null;
  importe_cent: number;
  fecha: string;
  metodo: string | null;
  nota: string | null;
};

/** Las formas de cobrar que usa el programa. */
export const METODOS = ["Pago único", "seQura", "Transferencia", "Tarjeta", "Bizum", "Otro"] as const;
export type Metodo = (typeof METODOS)[number];

/** Tope por apunte: un millón de euros. Por encima es un dedazo. */
export const MAX_CENT = 100_000_000;

/**
 * Un importe escrito a mano, en céntimos.
 *
 * Acepta lo que se teclea de verdad: «2500», «2.500», «2.500,50», «2500.50»,
 * «2 500 €». El punto puede ser separador de miles o decimal según el país y
 * según la prisa, así que se decide por la forma: si lo último son tres
 * cifras tras un punto y hay más puntos o comas antes, es de miles.
 */
export function importeACent(v: unknown): number | null {
  if (typeof v === "number") return desdeEuros(v);
  if (typeof v !== "string") return null;

  const s = v.trim().replace(/[€\s]/g, "");
  if (!s || !/^\d[\d.,]*$/.test(s)) return null;

  // Los grupos que separan los puntos y las comas. Si alguno viene vacío es que
  // había dos separadores pegados o uno al final: «2..5», «300,». Y todos los
  // grupos del medio tienen que ser de tres cifras, porque si no es que eso no
  // era un número, era un dedazo: «1,2,3,4».
  const trozos = s.split(/[.,]/);
  if (trozos.some((t) => t === "")) return null;
  for (let i = 1; i < trozos.length - 1; i++) if (trozos[i].length !== 3) return null;

  if (trozos.length === 1) return desdeEuros(Number(s));

  // El último grupo es el que decide qué era el separador anterior:
  //   · tres cifras → de miles: «2.500» son dos mil quinientos.
  //   · una o dos   → decimal: «2.500,50» y «2500.50» son lo mismo.
  const cola = trozos[trozos.length - 1];
  if (cola.length === 3) return desdeEuros(Number(trozos.join("")));
  if (cola.length > 3) return null;

  const enteros = trozos.slice(0, -1).join("");
  return desdeEuros(Number(`${enteros}.${cola}`));
}

function desdeEuros(n: number): number | null {
  if (!Number.isFinite(n) || n < 0) return null;
  const cent = Math.round(n * 100);
  return cent <= MAX_CENT ? cent : null;
}

/** «2.500,50 €», como se escribe aquí. */
export function textoEuros(cent: number): string {
  return `${(cent / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** «2.500 €» sin céntimos, para las cifras grandes del resumen. */
export function textoEurosCorto(cent: number): string {
  return `${Math.round(cent / 100).toLocaleString("es-ES")} €`;
}

/** ¿Es una fecha YYYY-MM-DD de verdad? */
export function fechaValida(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
}

/** El mes de una fecha: «2026-09». */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

export type Resumen = {
  /** Lo vendido: lo que se han comprometido a pagar. */
  facturado: number;
  /** Lo cobrado: lo que ha entrado de verdad. */
  cobrado: number;
  /** Lo vendido que todavía no ha entrado. Nunca negativo. */
  pendiente: number;
};

/**
 * Las tres cifras de un periodo.
 *
 * `mes` en formato «2026-09»; sin él, todo el histórico. Lo pendiente se
 * calcula SIEMPRE sobre el total, no sobre el mes: lo que se vendió en enero y
 * se cobra en marzo sigue pendiente hasta marzo, y mirando solo un mes saldría
 * un número que no significa nada.
 */
export function resumen(ventas: Venta[], cobros: Cobro[], mes?: string): Resumen {
  const enMes = <T extends { fecha: string }>(x: T) => !mes || mesDe(x.fecha) === mes;
  const suma = (n: number, x: { importe_cent: number }) => n + x.importe_cent;

  const facturado = ventas.filter(enMes).reduce(suma, 0);
  const cobrado = cobros.filter(enMes).reduce(suma, 0);
  const pendiente = Math.max(0, ventas.reduce(suma, 0) - cobros.reduce(suma, 0));

  return { facturado, cobrado, pendiente };
}

export type FilaClienta = {
  email: string;
  nombre: string;
  facturado: number;
  cobrado: number;
  pendiente: number;
  ultimoCobro: string | null;
};

/** Lo de cada clienta, de más pendiente a menos: arriba lo que hay que perseguir. */
export function porClienta(
  ventas: Venta[],
  cobros: Cobro[],
  nombreDe: (email: string) => string
): FilaClienta[] {
  const mapa = new Map<string, FilaClienta>();
  const dame = (email: string) => {
    let f = mapa.get(email);
    if (!f) {
      f = { email, nombre: nombreDe(email), facturado: 0, cobrado: 0, pendiente: 0, ultimoCobro: null };
      mapa.set(email, f);
    }
    return f;
  };

  for (const v of ventas) dame(v.member_email).facturado += v.importe_cent;
  for (const c of cobros) {
    const f = dame(c.member_email);
    f.cobrado += c.importe_cent;
    if (!f.ultimoCobro || c.fecha > f.ultimoCobro) f.ultimoCobro = c.fecha;
  }

  const filas: FilaClienta[] = [];
  mapa.forEach((f) => {
    f.pendiente = Math.max(0, f.facturado - f.cobrado);
    filas.push(f);
  });
  return filas.sort((a, b) => b.pendiente - a.pendiente || b.facturado - a.facturado);
}
