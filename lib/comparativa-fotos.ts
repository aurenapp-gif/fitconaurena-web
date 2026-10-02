/**
 * La primera foto de cada ángulo frente a la última, para la coach.
 *
 * Las revisiones guardan tres fotos (frente, perfil y espaldas) y cada una es
 * opcional: hay quien la primera vez solo se hizo la de frente y empezó con
 * las de espaldas tres revisiones después. Por eso cada ángulo busca SU
 * primera y SU última por separado, en vez de coger la primera y la última
 * revisión y mirar qué tienen: así, de espaldas se compara con la primera de
 * espaldas que hay, no con un hueco.
 */

export type AnguloId = "frente" | "perfil" | "espaldas";

export const ANGULOS: ReadonlyArray<{ id: AnguloId; nombre: string; campo: string }> = [
  { id: "frente", nombre: "Frente", campo: "photo_front" },
  { id: "perfil", nombre: "Perfil", campo: "photo_side" },
  { id: "espaldas", nombre: "Espaldas", campo: "photo_back" },
];

/** Lo que hace falta de una revisión para esto. El resto de columnas sobra. */
export type RevisionConFotos = {
  created_at: string;
  weight?: number | string | null;
  waist?: number | string | null;
  photo_front?: string | null;
  photo_side?: string | null;
  photo_back?: string | null;
};

/** Una foto concreta, con lo que pesaba y medía ese día. */
export type Toma = {
  fecha: string;
  path: string;
  peso: number | null;
  cintura: number | null;
};

export type Comparacion = {
  id: AnguloId;
  nombre: string;
  primera: Toma;
  ultima: Toma;
  /** Días entre las dos fotos. */
  dias: number;
  /** Kilos de diferencia (negativo = ha bajado). `null` si falta algún peso. */
  peso: number | null;
  /** Centímetros de cintura de diferencia (negativo = ha bajado). */
  cintura: number | null;
};

export type ResultadoComparacion = {
  /** Ángulos con dos fotos o más: los que se pueden comparar. */
  pares: Comparacion[];
  /** Ángulos con una sola foto: todavía no hay con qué compararla. */
  soloUna: AnguloId[];
  /** Ángulos de los que no hay ninguna foto. */
  sinNinguna: AnguloId[];
};

/** Número de verdad, o null. PostgREST devuelve los `numeric` como texto. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Diferencia redondeada a un decimal, o null si falta algún extremo. */
function delta(antes: number | null, despues: number | null): number | null {
  if (antes === null || despues === null) return null;
  return Math.round((despues - antes) * 10) / 10;
}

function diasEntre(a: string, b: string): number {
  const dia = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
  const d = dia(b) - dia(a);
  return Number.isFinite(d) ? Math.round(d / 86400000) : 0;
}

function tomaDe(r: RevisionConFotos, campo: string): Toma {
  return {
    fecha: r.created_at,
    path: String((r as unknown as Record<string, unknown>)[campo]),
    peso: num(r.weight),
    cintura: num(r.waist),
  };
}

/**
 * Las parejas de fotos de una clienta, ángulo a ángulo.
 *
 * Las revisiones pueden venir en cualquier orden: se ordenan aquí por fecha,
 * que es de lo que depende todo lo demás.
 */
export function comparacionDeFotos(revisiones: RevisionConFotos[]): ResultadoComparacion {
  const orden = [...revisiones].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pares: Comparacion[] = [];
  const soloUna: AnguloId[] = [];
  const sinNinguna: AnguloId[] = [];

  for (const ang of ANGULOS) {
    const conFoto = orden.filter((r) => {
      const v = (r as unknown as Record<string, unknown>)[ang.campo];
      return typeof v === "string" && v.trim() !== "";
    });
    if (conFoto.length === 0) { sinNinguna.push(ang.id); continue; }
    if (conFoto.length === 1) { soloUna.push(ang.id); continue; }

    const primera = tomaDe(conFoto[0], ang.campo);
    const ultima = tomaDe(conFoto[conFoto.length - 1], ang.campo);
    pares.push({
      id: ang.id,
      nombre: ang.nombre,
      primera,
      ultima,
      dias: diasEntre(primera.fecha, ultima.fecha),
      peso: delta(primera.peso, ultima.peso),
      cintura: delta(primera.cintura, ultima.cintura),
    });
  }

  return { pares, soloUna, sinNinguna };
}

/** «4 meses» · «28 días». Para poner debajo del par de fotos. */
export function textoPeriodo(dias: number): string {
  if (dias <= 0) return "el mismo día";
  if (dias < 45) return `${dias} ${dias === 1 ? "día" : "días"}`;
  const meses = Math.round(dias / 30.44);
  if (meses < 12) return `${meses} meses`;
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const a = `${anios} ${anios === 1 ? "año" : "años"}`;
  return resto === 0 ? a : `${a} y ${resto} ${resto === 1 ? "mes" : "meses"}`;
}

/** «−4,2 kg» · «+1,5 cm». Signo explícito: el sentido es lo que importa. */
export function textoDelta(valor: number, unidad: string): string {
  const signo = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return `${signo}${Math.abs(valor).toLocaleString("es-ES")} ${unidad}`;
}
