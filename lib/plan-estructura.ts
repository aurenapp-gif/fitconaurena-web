/**
 * El plan de una clienta, convertido de archivo a datos.
 *
 * Un plan llega como PDF, como foto de una hoja o como Word. Para poder
 * enseñarle «hoy te tocan 120 g de arroz» o «sentadilla, 4 series de 8», no
 * basta con tener el texto: hace falta saber qué es cada cosa.
 *
 * Aquí viven la forma de esos datos y el esquema que se le pasa a la API para
 * que devuelva exactamente eso y nada más.
 *
 * Dos reglas que gobiernan todo el fichero:
 *
 *  · NO SE INTERPRETA. Las cantidades se guardan tal y como están escritas
 *    («120 g», «1 pieza», «libre»), no como número y unidad por separado. Si
 *    el plan dice «2-3 huevos», eso es lo que se guarda. Inventarse un número
 *    exacto donde la coach dejó un rango sería cambiarle el plan a la clienta.
 *  · SI NO SE ENTIENDE, NO SE GUARDA. Un plan mal leído es peor que un plan
 *    sin leer: la clienta se comería otra cosa creyendo que es la suya. Ante
 *    la duda, `legible: false` y se usa el PDF de siempre.
 */

export type ItemComida = {
  /** Tal y como está escrito en el plan. */
  alimento: string;
  /** «120 g», «200 ml», «1 pieza», «libre». null si el plan no dice cantidad. */
  cantidad: string | null;
};

export type OpcionComida = {
  /** «Opción A», «Si entrenas por la mañana»… null si no hay alternativas. */
  etiqueta: string | null;
  items: ItemComida[];
};

export type Comida = {
  /** «Desayuno», «Media mañana», «Comida», «Merienda», «Cena». */
  nombre: string;
  /** La hora, si el plan la pone. */
  momento: string | null;
  opciones: OpcionComida[];
};

export type DiaNutricion = {
  /** «Todos los días» cuando el plan no distingue. */
  nombre: string;
  comidas: Comida[];
};

export type Ejercicio = {
  nombre: string;
  /** Número de series. null si el plan no lo dice. */
  series: number | null;
  /** «8», «8-10», «12 por pierna», «al fallo». Texto, no número. */
  repeticiones: string | null;
  /** «90 s», «2 min». */
  descanso: string | null;
  /** Indicación de la coach para ese ejercicio. */
  nota: string | null;
};

export type DiaEntrenamiento = {
  /** «Día A», «Lunes», «Sesión 1». */
  nombre: string;
  /** «Pierna», «Torso empuje». */
  foco: string | null;
  ejercicios: Ejercicio[];
};

export type EstructuraNutricion = {
  tipo: "nutricion";
  dias: DiaNutricion[];
  notas: string[];
};

export type EstructuraEntrenamiento = {
  tipo: "entrenamiento";
  dias: DiaEntrenamiento[];
  notas: string[];
};

export type Estructura = EstructuraNutricion | EstructuraEntrenamiento;

/* ------------------------------------------------------------------ *
 * Esquemas para la API
 * ------------------------------------------------------------------ */

// Los dos esquemas comparten forma pero se mandan por separado: al leer un
// plan ya sabemos de qué tipo es (lo eligió la coach al subirlo), y decírselo
// al modelo evita el único error que no se puede detectar después: leer una
// tabla de comidas como si fueran ejercicios.

const NOTAS = {
  type: "array",
  description: "Indicaciones generales del plan que no pertenecen a un día concreto.",
  items: { type: "string" },
} as const;

export const ESQUEMA_NUTRICION = {
  type: "object",
  additionalProperties: false,
  required: ["legible", "dias", "notas"],
  properties: {
    legible: {
      type: "boolean",
      description:
        "true solo si has podido leer el plan con seguridad. false si el archivo está borroso, cortado, no es un plan de alimentación, o hay cantidades que no se leen bien.",
    },
    dias: {
      type: "array",
      description:
        "Un elemento por cada día distinto. Si el plan es el mismo todos los días, devuelve UN solo elemento llamado «Todos los días».",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "comidas"],
        properties: {
          nombre: { type: "string" },
          comidas: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["nombre", "momento", "opciones"],
              properties: {
                nombre: { type: "string", description: "Desayuno, Comida, Cena…" },
                momento: { type: ["string", "null"], description: "La hora si el plan la indica." },
                opciones: {
                  type: "array",
                  description: "Una por cada alternativa que dé el plan para esa comida. Si no hay alternativas, una sola con etiqueta null.",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["etiqueta", "items"],
                    properties: {
                      etiqueta: { type: ["string", "null"] },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: ["alimento", "cantidad"],
                          properties: {
                            alimento: { type: "string" },
                            cantidad: {
                              type: ["string", "null"],
                              description:
                                "Copiada LITERALMENTE del plan, con su unidad: «120 g», «200 ml», «1 pieza», «libre». Nunca la conviertas ni la redondees. null si el plan no dice cantidad.",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    notas: NOTAS,
  },
} as const;

export const ESQUEMA_ENTRENAMIENTO = {
  type: "object",
  additionalProperties: false,
  required: ["legible", "dias", "notas"],
  properties: {
    legible: {
      type: "boolean",
      description:
        "true solo si has podido leer el plan con seguridad. false si el archivo está borroso, cortado, no es un plan de entrenamiento, o hay series o repeticiones que no se leen bien.",
    },
    dias: {
      type: "array",
      description: "Una sesión por elemento, en el orden del plan.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "foco", "ejercicios"],
        properties: {
          nombre: { type: "string", description: "«Día A», «Lunes», «Sesión 1»… como lo llame el plan." },
          foco: { type: ["string", "null"], description: "«Pierna», «Torso»… si el plan lo dice." },
          ejercicios: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["nombre", "series", "repeticiones", "descanso", "nota"],
              properties: {
                nombre: { type: "string", description: "El nombre del ejercicio, tal cual." },
                series: { type: ["integer", "null"], description: "Solo el número de series. null si no lo dice." },
                repeticiones: {
                  type: ["string", "null"],
                  description:
                    "Como esté escrito: «8», «8-10», «12 por pierna», «al fallo». Texto, nunca un número inventado.",
                },
                descanso: { type: ["string", "null"], description: "«90 s», «2 min»." },
                nota: { type: ["string", "null"], description: "Indicación de técnica o aclaración para ese ejercicio." },
              },
            },
          },
        },
      },
    },
    notas: NOTAS,
  },
} as const;

export const INSTRUCCION_NUTRICION = `Este archivo es el plan de ALIMENTACIÓN que una entrenadora ha hecho para una clienta concreta. Pásalo a datos.

Copia las cantidades LITERALMENTE, con su unidad y como estén escritas. No conviertas gramos a otra cosa, no redondees, no calcules calorías y no juntes alimentos. Si pone «2-3 huevos», la cantidad es «2-3». Si pone «libre», es «libre».

No añadas nada que no esté en el papel: ni alimentos, ni alternativas, ni consejos tuyos.

Si el plan es igual todos los días, devuelve un único día llamado «Todos los días». Si distingue días, uno por cada uno, con el nombre que use el plan.

Si algo no se lee con seguridad, o esto no es un plan de alimentación, pon legible en false y deja las listas vacías. Es mejor eso que una cantidad equivocada.`;

export const INSTRUCCION_ENTRENAMIENTO = `Este archivo es el plan de ENTRENAMIENTO que una entrenadora ha hecho para una clienta concreta. Pásalo a datos.

Copia los nombres de los ejercicios tal y como están escritos, sin traducirlos ni normalizarlos: si pone «Hip thrust», es «Hip thrust». Las repeticiones, como estén: «8», «8-10», «12 por pierna».

No añadas ejercicios, series ni indicaciones que no estén en el papel.

Cada sesión es un día, en el orden del plan. Si hay una indicación de técnica junto a un ejercicio, va en su nota.

Si algo no se lee con seguridad, o esto no es un plan de entrenamiento, pon legible en false y deja las listas vacías. Es mejor eso que unas series equivocadas.`;

/* ------------------------------------------------------------------ *
 * Validación
 * ------------------------------------------------------------------ */

const txt = (v: unknown, max = 200): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * La respuesta del modelo, pasada por el filtro antes de guardarla.
 *
 * El esquema ya obliga a la forma, pero esto es lo que se guarda en la base y
 * lo que acaba delante de una clienta: se comprueba igualmente. Un plan vacío
 * se trata como ilegible, porque enseñar un plan sin nada dentro asusta más
 * que enseñar el PDF.
 */
export function normaliza(tipo: "nutricion" | "entrenamiento", bruto: unknown): Estructura | null {
  const o = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  if (o.legible === false) return null;

  const notas = lista(o.notas).map((n) => txt(n, 600)).filter((n): n is string => !!n).slice(0, 20);

  if (tipo === "nutricion") {
    const dias: DiaNutricion[] = [];
    for (const d of lista(o.dias).slice(0, 31)) {
      const dd = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
      const comidas: Comida[] = [];
      for (const c of lista(dd.comidas).slice(0, 12)) {
        const cc = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
        const opciones: OpcionComida[] = [];
        for (const op of lista(cc.opciones).slice(0, 8)) {
          const oo = (op && typeof op === "object" ? op : {}) as Record<string, unknown>;
          const items: ItemComida[] = [];
          for (const it of lista(oo.items).slice(0, 30)) {
            const ii = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
            const alimento = txt(ii.alimento, 160);
            if (alimento) items.push({ alimento, cantidad: txt(ii.cantidad, 60) });
          }
          if (items.length) opciones.push({ etiqueta: txt(oo.etiqueta, 120), items });
        }
        const nombre = txt(cc.nombre, 80);
        if (nombre && opciones.length) comidas.push({ nombre, momento: txt(cc.momento, 40), opciones });
      }
      const nombre = txt(dd.nombre, 80);
      if (nombre && comidas.length) dias.push({ nombre, comidas });
    }
    return dias.length ? { tipo: "nutricion", dias, notas } : null;
  }

  const dias: DiaEntrenamiento[] = [];
  for (const d of lista(o.dias).slice(0, 14)) {
    const dd = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    const ejercicios: Ejercicio[] = [];
    for (const e of lista(dd.ejercicios).slice(0, 30)) {
      const ee = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
      const nombre = txt(ee.nombre, 120);
      if (!nombre) continue;
      const s = Number(ee.series);
      ejercicios.push({
        nombre,
        series: Number.isInteger(s) && s > 0 && s <= 20 ? s : null,
        repeticiones: txt(ee.repeticiones, 60),
        descanso: txt(ee.descanso, 40),
        nota: txt(ee.nota, 400),
      });
    }
    const nombre = txt(dd.nombre, 80);
    if (nombre && ejercicios.length) dias.push({ nombre, foco: txt(dd.foco, 80), ejercicios });
  }
  return dias.length ? { tipo: "entrenamiento", dias, notas } : null;
}

/* ------------------------------------------------------------------ *
 * De vuelta a texto
 * ------------------------------------------------------------------ */

/** Cómo se escribe un ejercicio en una línea: «Sentadilla — 4×8, descanso 90 s». */
export function lineaEjercicio(e: Ejercicio): string {
  const carga = [e.series ? `${e.series}×${e.repeticiones ?? "?"}` : e.repeticiones, e.descanso ? `descanso ${e.descanso}` : null]
    .filter(Boolean)
    .join(", ");
  return `${e.nombre}${carga ? ` — ${carga}` : ""}${e.nota ? ` (${e.nota})` : ""}`;
}

/** Cómo se escribe un item de comida: «Arroz basmati — 120 g». */
export function lineaItem(i: ItemComida): string {
  return `${i.alimento}${i.cantidad ? ` — ${i.cantidad}` : ""}`;
}

/**
 * El plan otra vez en texto, para que FitAI lo lea.
 *
 * Se genera de la estructura en vez de guardar la transcripción por separado:
 * así no pueden decir cosas distintas. Lo que ve la clienta en pantalla y lo
 * que sabe FitAI salen de la misma fuente.
 */
export function textoDeEstructura(e: Estructura): string {
  const out: string[] = [];
  if (e.tipo === "nutricion") {
    for (const d of e.dias) {
      out.push(`## ${d.nombre}`);
      for (const c of d.comidas) {
        out.push(`### ${c.nombre}${c.momento ? ` (${c.momento})` : ""}`);
        for (const op of c.opciones) {
          if (op.etiqueta) out.push(`${op.etiqueta}:`);
          for (const i of op.items) out.push(`- ${lineaItem(i)}`);
        }
      }
    }
  } else {
    for (const d of e.dias) {
      out.push(`## ${d.nombre}${d.foco ? ` · ${d.foco}` : ""}`);
      for (const ej of d.ejercicios) out.push(`- ${lineaEjercicio(ej)}`);
    }
  }
  if (e.notas.length) {
    out.push("## Indicaciones del plan");
    for (const n of e.notas) out.push(`- ${n}`);
  }
  return out.join("\n");
}
