/**
 * La parte de alimentación del analizador.
 *
 * Aquí está la única cuenta del sistema que de verdad separa «no funciona su
 * metabolismo» de «no se está comiendo lo que pone el plan», y por eso merece
 * explicación:
 *
 *   Si una clienta come EXACTAMENTE las kcal pautadas, su gasto real se puede
 *   despejar de lo que ha pasado con su peso:
 *
 *       gasto = kcal pautadas - (kilos perdidos x 7.700 / días)
 *
 *   Cuando ese gasto sale por debajo de lo que el cuerpo quema estando
 *   tumbado, la cuenta no puede ser cierta: nadie gasta menos que su
 *   metabolismo basal moviéndose y entrenando. Lo que falla no es su cuerpo,
 *   es lo que entra. Lichtman (1992) midió esto con agua doblemente marcada en
 *   personas convencidas de que su metabolismo era el problema: subestimaban
 *   lo que comían un 47 % de media y su gasto estaba dentro del 5 % de lo
 *   previsto.
 *
 * Todo lo de aquí son estimaciones y se dicen como tales. Los 7.700 kcal por
 * kilo son una aproximación, el peso se mueve con el agua, y por eso la cuenta
 * solo se enseña con tres semanas de margen o más.
 */

/** Kcal por kilo de peso corporal. Aproximación clásica, suficiente a semanas vista. */
export const KCAL_POR_KG = 7700;

/** Proteína en gramos por kilo de peso corporal y día, en déficit. */
export const PROTEINA_G_KG = { minimo: 1.6, bueno: 2.0, maximo: 2.2 };

/** Suelo absoluto de calorías por debajo del cual no se baja a nadie. */
export const KCAL_SUELO = 1200;

/**
 * Metabolismo basal por Mifflin-St Jeor, la ecuación que más veces acierta
 * dentro del 10 % (en mujeres con sobrepeso, 8 de cada 10).
 *
 * Fórmula de mujer: todas las clientas del programa lo son. Si algún día deja
 * de ser así, esto hay que tocarlo.
 */
export function metabolismoBasal(kg: number | null, cm: number | null, edad: number | null): number | null {
  if (!kg || !cm || !edad || kg <= 0 || cm <= 0 || edad <= 0) return null;
  return Math.round(10 * kg + 6.25 * cm - 5 * edad - 161);
}

/**
 * El gasto diario que haría falta para que cuadren las kcal pautadas con los
 * kilos que se han movido. `null` si falta algo o el plazo es demasiado corto
 * para que el agua corporal no mande sobre el resultado.
 */
export function gastoImplicito(
  kcalPautadas: number | null,
  deltaKg: number | null,
  dias: number
): number | null {
  if (!kcalPautadas || kcalPautadas <= 0 || deltaKg === null || dias < 21) return null;
  return Math.round(kcalPautadas - (deltaKg * KCAL_POR_KG) / dias);
}

/** Gramos de proteína por kilo, redondeado a una décima. */
export function proteinaPorKg(gramos: number | null, kg: number | null): number | null {
  if (!gramos || !kg || gramos <= 0 || kg <= 0) return null;
  return Math.round((gramos / kg) * 10) / 10;
}

export type Macros = { kcal: number | null; proteina: number | null };

/** Rangos de lo que puede ser de verdad una pauta, para no leer un número suelto. */
const LIMITES = { kcal: [800, 5000], proteina: [30, 350] } as const;

/**
 * Busca las calorías y la proteína en el texto del plan, para no tener que
 * teclearlas.
 *
 * Se exige que el número vaya pegado a su palabra («2.100 kcal», «proteína:
 * 130 g»). En un plan hay cientos de números —gramos de pollo, de arroz— y
 * coger el primero que aparezca sería peor que no detectar nada: la coach se
 * fiaría de una cifra inventada. Lo que sale de aquí se le propone, no se
 * guarda solo.
 */
export function detectarMacros(texto: string | null | undefined): Macros {
  const t = (texto ?? "").normalize("NFC");
  const numero = (s: string): number | null => {
    // «2.100» y «2100» son lo mismo; «2,1» no es una pauta de calorías.
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const dentro = (n: number | null, [min, max]: readonly [number, number]) =>
    n !== null && n >= min && n <= max ? Math.round(n) : null;

  /** El primer número de `patron` que caiga dentro de lo que puede ser una pauta. */
  const buscar = (patrones: RegExp[], limites: readonly [number, number]): number | null => {
    for (const re of patrones) {
      let m: RegExpExecArray | null;
      const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      while ((m = r.exec(t)) !== null) {
        const v = dentro(numero(m[1]), limites);
        if (v !== null) return v;
      }
    }
    return null;
  };

  const kcal = buscar([
    /(\d[\d.,]{2,6})\s*(?:kcal|kilocalor\w*|calor[ií]as?)\b/gi,
    /(?:kcal|calor[ií]as?|energ[ií]a)\s*(?:totales?|diarias?)?\s*[:=]?\s*(\d[\d.,]{2,6})/gi,
  ], LIMITES.kcal);

  const proteina = buscar([
    /prote[ií]nas?\s*(?:totales?|diarias?)?\s*[:=]?\s*(\d[\d.,]{1,5})\s*g?\b/gi,
    /(\d[\d.,]{1,5})\s*g(?:ramos)?\s*(?:de\s*)?prote[ií]nas?/gi,
  ], LIMITES.proteina);

  return { kcal, proteina };
}

/** Lo que se guarda cuando la coach lo confirma o lo escribe a mano. */
export function macrosValidos(kcal: unknown, proteina: unknown): Macros {
  const limpiar = (v: unknown, [min, max]: readonly [number, number]): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  return { kcal: limpiar(kcal, LIMITES.kcal), proteina: limpiar(proteina, LIMITES.proteina) };
}

/** El SQL de `supabase/nutricion.sql`, para enseñarlo si faltan las columnas. */
export const SETUP_SQL = `alter table public.plans add column if not exists kcal int;
alter table public.plans add column if not exists protein_g int;`;
