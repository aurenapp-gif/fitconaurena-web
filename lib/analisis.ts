/**
 * El analizador: qué está frenando los resultados de una clienta.
 *
 * Son reglas, no una inteligencia artificial. Cada una mira un dato que la app
 * ya tiene, lo compara con el umbral que sale de un estudio (lib/evidencia.ts)
 * y dice qué hacer. Así la recomendación es siempre la misma para los mismos
 * datos, se puede discutir el número y no cuesta un céntimo por clienta.
 *
 * Tres principios:
 *  - Si no hay datos suficientes, se dice que faltan. No se opina a ciegas.
 *  - Cada hallazgo lleva el dato que lo provoca, para poder llevarle la
 *    contraria a la app mirando el mismo número.
 *  - Lo que decide es la coach. Esto es dónde mirar, no qué hacer.
 */

import {
  CICLO, CINTURA, CONSTANCIA, DESCANSO, FUENTES, PASOS, RITMO, SUENO, VOLUMEN,
  type Fuente,
} from "./evidencia";
import { NOMBRE_GRUPO, seriesPorGrupo, type Grupo } from "./musculos";
import { KCAL_SUELO, PROTEINA_G_KG, gastoImplicito, metabolismoBasal, proteinaPorKg } from "./nutricion";

export type Prioridad = "alta" | "media" | "baja" | "info";

export type Hallazgo = {
  id: string;
  prioridad: Prioridad;
  /** Qué pasa, en una línea. */
  titulo: string;
  /** El número que lo provoca. */
  dato: string;
  /** Qué hacer con ello. */
  quehacer: string;
  fuente?: Fuente;
};

export type Revision = {
  created_at: string;
  weight?: number | string | null;
  waist?: number | string | null;
};
export type Habito = {
  day: string;
  steps?: number | string | null;
  sleep?: number | string | null;
  cycle_day?: number | string | null;
};
export type Serie = { ejercicio: string; peso?: number | string | null; reps?: number | string | null; created_at: string };

/** La pauta del plan de alimentación vigente. */
export type PautaNutricion = { kcal: number | null; proteina: number | null; tienePlan: boolean };

export type DatosClienta = {
  objetivo: string | null;
  /** Para el metabolismo basal. Sin esto no hay cuentas de comida. */
  alturaCm?: number | null;
  edad?: number | null;
  nutricion?: PautaNutricion | null;
  /** De la más antigua a la más reciente. */
  revisiones: Revision[];
  habitos: Habito[];
  series: Serie[];
  pasosObjetivo: number | null;
  /** YYYY-MM-DD. Se pasa para que las pruebas no dependan del día de hoy. */
  hoy: string;
};

const ORDEN: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2, info: 3 };

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const dia = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
const diasEntre = (a: string, b: string) => Math.round((dia(b) - dia(a)) / 86400000);
const un = (n: number, d = 1) => Number(n.toFixed(d)).toLocaleString("es-ES");

/** ¿Su objetivo es perder grasa? De ahí depende si el ritmo importa. */
export function buscaPerderGrasa(objetivo: string | null): boolean {
  const o = (objetivo ?? "").toLowerCase();
  return o.includes("perder") || o.includes("grasa") || o.includes("adelgaz");
}

export type Ritmo = { pctSemanal: number; kg: number; semanas: number; desde: string; hasta: string };

/**
 * Velocidad de pérdida en las últimas semanas, en % del peso por semana.
 *
 * Se mide contra el peso de hace seis semanas como mucho: con el primero de
 * todos, una clienta que lleva ocho meses sale siempre «bien» aunque lleve dos
 * meses parada. Y hacen falta tres semanas de margen para que el ruido del día
 * a día no se lea como una tendencia.
 */
export function ritmoReciente(revisiones: Revision[], ventanaDias = 42, maxDias = 112): Ritmo | null {
  const conPeso = revisiones
    .map((r) => ({ fecha: r.created_at, kg: num(r.weight) }))
    .filter((r): r is { fecha: string; kg: number } => r.kg !== null && r.kg > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (conPeso.length < 2) return null;

  const ultima = conPeso[conPeso.length - 1];
  const minimo = RITMO.semanasMinimas * 7;
  // El punto de partida es el más antiguo que entre en la ventana. Pero las
  // revisiones son el día 1 y el 15: si las dos últimas están a 16 días, la
  // ventana sola se queda corta para hablar de tendencia. En ese caso se sigue
  // hacia atrás hasta encontrar un peso que dé margen suficiente, sin pasarse
  // de `maxDias` —más atrás ya es otra etapa del programa, no la de ahora—.
  let primera = conPeso.filter((r) => diasEntre(r.fecha, ultima.fecha) <= ventanaDias)[0];
  if (diasEntre(primera.fecha, ultima.fecha) < minimo) {
    const masAtras = conPeso.find(
      (r) => diasEntre(r.fecha, ultima.fecha) >= minimo && diasEntre(r.fecha, ultima.fecha) <= maxDias
    );
    if (masAtras) primera = masAtras;
  }
  const dias = diasEntre(primera.fecha, ultima.fecha);
  if (dias < minimo) return null;

  const semanas = dias / 7;
  const kg = ultima.kg - primera.kg;
  return {
    pctSemanal: (kg / primera.kg) * 100 / semanas,
    kg,
    semanas,
    desde: primera.fecha,
    hasta: ultima.fecha,
  };
}

/** Media de un hábito en los últimos `dias` días, con cuántos registros hay. */
function media(habitos: Habito[], campo: "steps" | "sleep", hoy: string, dias = 30) {
  const vals = habitos
    .filter((h) => diasEntre(h.day, hoy) <= dias && diasEntre(h.day, hoy) >= 0)
    .map((h) => num(h[campo]))
    .filter((v): v is number => v !== null && v > 0);
  if (vals.length === 0) return { media: null as number | null, n: 0 };
  return { media: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length };
}

/** La mejor serie de cada ejercicio, por peso×repeticiones. */
function mejorPorEjercicio(series: Serie[]) {
  const mejor = new Map<string, { carga: number; fecha: string }>();
  for (const s of series) {
    const peso = num(s.peso), reps = num(s.reps);
    if (peso === null || reps === null || peso <= 0 || reps <= 0) continue;
    const carga = peso * reps;
    const prev = mejor.get(s.ejercicio);
    if (!prev || carga > prev.carga) mejor.set(s.ejercicio, { carga, fecha: s.created_at });
  }
  return mejor;
}

/**
 * Todo lo que merece la pena mirar de una clienta, de lo más urgente a lo
 * menos. Devuelve también lo que falta por saber para poder decidir.
 */
export function analizar(d: DatosClienta): Hallazgo[] {
  const h: Hallazgo[] = [];
  const perderGrasa = buscaPerderGrasa(d.objetivo);
  const revisiones = [...d.revisiones].sort((a, b) => a.created_at.localeCompare(b.created_at));

  // ---- Peso: ¿a qué velocidad va? ------------------------------------------
  const ritmo = ritmoReciente(revisiones);
  if (!ritmo) {
    h.push({
      id: "sin-peso",
      prioridad: "info",
      titulo: "Todavía no se puede medir el ritmo",
      dato: `Hacen falta dos pesos separados al menos ${RITMO.semanasMinimas} semanas.`,
      quehacer: "Si ella prefiere no pesarse, usa la cintura y las fotos como medida principal.",
    });
  } else if (perderGrasa) {
    const pct = Math.abs(ritmo.pctSemanal);
    if (ritmo.pctSemanal < 0 && pct > RITMO.demasiadoRapido) {
      h.push({
        id: "ritmo-rapido",
        prioridad: "alta",
        titulo: "Está bajando demasiado rápido",
        dato: `${un(pct)} % del peso por semana (${un(ritmo.kg)} kg en ${un(ritmo.semanas)} semanas). El techo son ${RITMO.demasiadoRapido} %.`,
        quehacer: `Subir calorías hasta dejarlo entre ${RITMO.minBueno} y ${RITMO.maxBueno} % por semana. A este ritmo lo que se pierde de más es músculo y fuerza, no grasa.`,
        fuente: FUENTES.ritmoFuerza,
      });
    } else if (pct < RITMO.estancada) {
      h.push({
        id: "ritmo-parado",
        prioridad: "alta",
        titulo: "Lleva semanas parada",
        dato: `${un(pct)} % por semana en las últimas ${un(ritmo.semanas)} semanas (${un(ritmo.kg)} kg).`,
        quehacer: "Antes de tocar las calorías, mira abajo el sueño, los pasos y la constancia: suele estar ahí.",
        fuente: FUENTES.ritmo,
      });
    } else if (ritmo.pctSemanal < 0) {
      h.push({
        id: "ritmo-bien",
        prioridad: "info",
        titulo: "El ritmo es el bueno",
        dato: `${un(pct)} % por semana (${un(ritmo.kg)} kg en ${un(ritmo.semanas)} semanas).`,
        quehacer: "No tocar nada por el peso. Si algo hay que ajustar, que sea por entrenamiento o descanso.",
        fuente: FUENTES.ritmo,
      });
    }
  }

  // ---- ¿Lleva demasiado tiempo seguido en déficit? --------------------------
  if (perderGrasa && ritmo && Math.abs(ritmo.pctSemanal) < RITMO.estancada && revisiones.length >= 2) {
    const primeraConPeso = revisiones.find((r) => num(r.weight) !== null);
    const semanasTotales = primeraConPeso ? diasEntre(primeraConPeso.created_at, d.hoy) / 7 : 0;
    const perdidaTotal = primeraConPeso
      ? (num(revisiones[revisiones.length - 1].weight) ?? 0) - (num(primeraConPeso.weight) ?? 0)
      : 0;
    if (semanasTotales >= DESCANSO.semanasSeguidas && perdidaTotal < 0) {
      h.push({
        id: "descanso-metabolico",
        prioridad: "media",
        titulo: "Toca un descanso del déficit",
        dato: `${Math.round(semanasTotales)} semanas desde su primera revisión y el ritmo se ha parado.`,
        quehacer: `${DESCANSO.semanasDescanso} semanas comiendo a mantenimiento y después volver al déficit. En el estudio MATADOR, alternar así hizo perder más grasa que seguir de seguido.`,
        fuente: FUENTES.descanso,
      });
    }
  }

  // ---- Sueño ---------------------------------------------------------------
  const sueno = media(d.habitos, "sleep", d.hoy);
  if (sueno.media !== null && sueno.n >= 7) {
    if (sueno.media < SUENO.minimo) {
      h.push({
        id: "sueno",
        prioridad: sueno.media < SUENO.critico ? "alta" : "media",
        titulo: "Duerme poco, y eso cambia de dónde sale el peso que pierde",
        dato: `${un(sueno.media)} h de media en ${sueno.n} días apuntados. El mínimo son ${SUENO.minimo} h.`,
        quehacer: "Con el MISMO déficit, durmiendo 5,5 h en vez de 8,5 se pierde un 55 % menos de grasa y un 60 % más de músculo. Antes de bajarle calorías, arregla esto.",
        fuente: FUENTES.sueno,
      });
    }
  } else {
    h.push({
      id: "sin-sueno",
      prioridad: "info",
      titulo: "No sabemos cuánto duerme",
      dato: `${sueno.n} días apuntados en el último mes.`,
      quehacer: "Pídele que lo apunte unas semanas: es la palanca más grande que no estamos viendo.",
    });
  }

  // ---- Pasos ---------------------------------------------------------------
  const pasos = media(d.habitos, "steps", d.hoy);
  const objetivoPasos = d.pasosObjetivo ?? PASOS.objetivo;
  if (pasos.media !== null && pasos.n >= 7) {
    if (pasos.media < PASOS.bajo) {
      const faltan = Math.round(objetivoPasos - pasos.media);
      h.push({
        id: "pasos",
        prioridad: "media",
        titulo: "Se mueve poco fuera del gimnasio",
        dato: `${Math.round(pasos.media).toLocaleString("es-ES")} pasos de media en ${pasos.n} días. Su objetivo: ${objetivoPasos.toLocaleString("es-ES")}.`,
        quehacer: `Subir unos ${faltan.toLocaleString("es-ES")} pasos al día, poco a poco. Cada 1.000 pasos más se asocian a un 1,1–1,3 % mejor de resultado.`,
        fuente: FUENTES.pasos,
      });
    }
  }

  // ---- Constancia ----------------------------------------------------------
  //
  // Con una clienta que acaba de entrar esto no se mide: lleva tres días, es
  // normal que no haya apuntado un mes. Señalarla en rojo el primer día haría
  // que la coach dejara de fiarse de la pantalla entera.
  const primerRastro = [
    ...d.habitos.map((x) => x.day.slice(0, 10)),
    ...revisiones.map((r) => r.created_at.slice(0, 10)),
  ].sort()[0];
  const antiguedad = primerRastro ? diasEntre(primerRastro, d.hoy) : 0;
  const diasApuntados = new Set(
    d.habitos.filter((x) => diasEntre(x.day, d.hoy) <= 28 && diasEntre(x.day, d.hoy) >= 0).map((x) => x.day)
  ).size;
  const porSemana = diasApuntados / 4;
  if (antiguedad < 21) {
    h.push({
      id: "recien-entrada",
      prioridad: "info",
      titulo: "Lleva muy poco para medir nada",
      dato: primerRastro ? `Su primer dato es de hace ${antiguedad} días.` : "Todavía no ha apuntado nada.",
      quehacer: "Las primeras tres semanas son para coger el hábito. Vuelve por aquí cuando tenga un mes de datos.",
    });
  } else if (porSemana < CONSTANCIA.minimoSemanal) {
    h.push({
      id: "constancia",
      prioridad: porSemana < 1 ? "alta" : "media",
      titulo: "Apunta poco, y eso predice el resultado",
      dato: `${un(porSemana)} días por semana en el último mes (${diasApuntados} de 28).`,
      quehacer: "En 22 de 22 estudios, cuanto más se autorregistra más se pierde. Mejor pedirle una cosa sola todos los días que cinco a medias.",
      fuente: FUENTES.constancia,
    });
  }

  // ---- Fuerza: volumen por grupo muscular ----------------------------------
  const seriesMes = d.series.filter((s) => diasEntre(s.created_at, d.hoy) <= 28 && diasEntre(s.created_at, d.hoy) >= 0);
  if (seriesMes.length > 0) {
    const { porGrupo, sinClasificar } = seriesPorGrupo(seriesMes);
    const flojos: string[] = [];
    for (const [g, n] of Array.from(porGrupo.entries())) {
      const semanal = n / 4;
      if (semanal < VOLUMEN.minimoSemanal) flojos.push(`${NOMBRE_GRUPO[g as Grupo]} (${un(semanal)})`);
    }
    if (flojos.length > 0) {
      h.push({
        id: "volumen",
        prioridad: "media",
        titulo: "Hay grupos que se quedan cortos de series",
        dato: `Series por semana: ${flojos.join(", ")}. El mínimo que mueve la aguja son ${VOLUMEN.minimoSemanal}.`,
        quehacer: "Añadir series a esos grupos antes que meter ejercicios nuevos, y repartirlos en dos días en vez de uno.",
        fuente: FUENTES.volumen,
      });
    }
    if (sinClasificar.length > 0) {
      h.push({
        id: "sin-clasificar",
        prioridad: "info",
        titulo: "Hay ejercicios que no sé de qué grupo son",
        dato: sinClasificar.slice(0, 6).join(" · "),
        quehacer: "No los he contado en ningún grupo, para no inflar un número. Si me dices de cuál son, los añado.",
      });
    }

    // Progresión: lo que lleva un mes sin subir.
    const viejas = d.series.filter((s) => {
      const dd = diasEntre(s.created_at, d.hoy);
      return dd > 28 && dd <= 28 + VOLUMEN.semanasSinProgresar * 7;
    });
    if (viejas.length > 0) {
      const antes = mejorPorEjercicio(viejas);
      const ahora = mejorPorEjercicio(seriesMes);
      const parados: string[] = [];
      for (const [ej, a] of Array.from(ahora.entries())) {
        const b = antes.get(ej);
        if (b && a.carga <= b.carga) parados.push(ej);
      }
      if (parados.length > 0) {
        h.push({
          id: "progresion",
          prioridad: "media",
          titulo: "Ejercicios que llevan un mes sin subir",
          dato: parados.slice(0, 6).join(" · "),
          quehacer: "Cambiar el estímulo: más repeticiones con el mismo peso, una serie más, o cambiar el ejercicio por otro del mismo grupo.",
          fuente: FUENTES.volumen,
        });
      }
    }
  } else {
    h.push({
      id: "sin-entrenos",
      prioridad: "info",
      titulo: "No ha apuntado entrenos este mes",
      dato: "Sin series apuntadas en 28 días.",
      quehacer: "Sin esto no se puede ver si progresa ni cuántas series hace por grupo. Es lo que más información daría.",
    });
  }

  // ---- Alimentación --------------------------------------------------------
  //
  // Todo esto necesita la pauta del plan (kcal y proteína). Sin ella no se
  // opina de comida: se pide el dato, que es lo único honesto.
  const pesoActual = (() => {
    for (let i = revisiones.length - 1; i >= 0; i--) {
      const kg = num(revisiones[i].weight);
      if (kg !== null && kg > 0) return kg;
    }
    return null;
  })();
  const basal = metabolismoBasal(pesoActual, d.alturaCm ?? null, d.edad ?? null);
  const pauta = d.nutricion ?? null;

  if (pauta?.tienePlan && !pauta.kcal && !pauta.proteina) {
    h.push({
      id: "sin-pauta",
      prioridad: "info",
      titulo: "No sé qué le has pautado de comer",
      dato: "Su plan de alimentación no tiene apuntadas las calorías ni la proteína.",
      quehacer: "Apúntalas en su ficha, debajo del plan. Con eso se puede saber si el problema es la pauta o lo que se come de verdad.",
    });
  }

  if (pauta?.proteina && pesoActual) {
    const gkg = proteinaPorKg(pauta.proteina, pesoActual);
    if (gkg !== null && gkg < PROTEINA_G_KG.minimo) {
      const faltan = Math.round((PROTEINA_G_KG.bueno - gkg) * pesoActual);
      h.push({
        id: "proteina-baja",
        prioridad: "alta",
        titulo: "Se queda corta de proteína",
        dato: `${un(gkg, 2)} g por kilo (${pauta.proteina} g para ${un(pesoActual)} kg). En déficit hacen falta ${PROTEINA_G_KG.minimo}.`,
        quehacer: `Subir unos ${faltan} g al día hasta ${Math.round(PROTEINA_G_KG.bueno * pesoActual)} g. Es lo que decide cuánto de lo que pierde es grasa y cuánto es músculo.`,
        fuente: FUENTES.proteina,
      });
    }
  }

  if (pauta?.kcal && basal) {
    if (pauta.kcal < basal || pauta.kcal < KCAL_SUELO) {
      h.push({
        id: "kcal-bajo-basal",
        prioridad: "alta",
        titulo: "La pauta está por debajo de lo que gasta en reposo",
        dato: `${pauta.kcal.toLocaleString("es-ES")} kcal pautadas y su metabolismo basal estimado son ${basal.toLocaleString("es-ES")} kcal.`,
        quehacer: "Subir la pauta. Por debajo del basal no se acelera nada: se pierde más músculo, se hunde el rendimiento y en mujeres aparecen alteraciones del ciclo.",
        fuente: FUENTES.energia,
      });
    }
  }

  // La cuenta que separa el metabolismo de la adherencia.
  if (pauta?.kcal && basal && ritmo) {
    const gasto = gastoImplicito(pauta.kcal, ritmo.kg, Math.round(ritmo.semanas * 7));
    if (gasto !== null) {
      if (gasto < basal * 1.1) {
        h.push({
          id: "come-mas-de-lo-que-cree",
          prioridad: "alta",
          titulo: "Los números solo cuadran si come más de lo pautado",
          dato: `Con ${pauta.kcal.toLocaleString("es-ES")} kcal y ${un(ritmo.kg)} kg en ${un(ritmo.semanas)} semanas, su gasto tendría que ser ${gasto.toLocaleString("es-ES")} kcal/día. Su basal estimado es ${basal.toLocaleString("es-ES")}.`,
          quehacer: "Nadie gasta menos que su metabolismo basal entrenando y andando, así que la pauta no se está cumpliendo. Antes de bajarle calorías, repasa con ella fines de semana, aceite, bebidas y picoteo. Bajar la pauta de quien no la cumple solo agranda el hueco.",
          fuente: FUENTES.subregistro,
        });
      } else if (gasto > basal * 1.2 && gasto < basal * 2.2) {
        h.push({
          id: "pauta-calibrada",
          prioridad: "info",
          titulo: "La pauta cuadra con lo que está pasando",
          dato: `Su gasto estimado es ${gasto.toLocaleString("es-ES")} kcal/día (${un(gasto / basal, 2)} veces su basal), coherente con las ${pauta.kcal.toLocaleString("es-ES")} pautadas.`,
          quehacer: "El plan está bien calibrado. Si hay que cambiar algo, que no sean las calorías.",
          fuente: FUENTES.subregistro,
        });
      }
    }
  }

  // ---- Cintura: ruido y medidas imposibles ---------------------------------
  const conCintura = revisiones
    .map((r) => ({ fecha: r.created_at, cm: num(r.waist), kg: num(r.weight) }))
    .filter((r): r is { fecha: string; cm: number; kg: number | null } => r.cm !== null);
  if (conCintura.length >= 2) {
    const a = conCintura[conCintura.length - 2];
    const b = conCintura[conCintura.length - 1];
    const dCm = b.cm - a.cm;
    const dKg = a.kg !== null && b.kg !== null ? b.kg - a.kg : null;
    if (Math.abs(dCm) >= CINTURA.saltoImposibleCm && (dKg === null || Math.abs(dKg) < CINTURA.pesoQueLoJustifica)) {
      h.push({
        id: "cintura-imposible",
        prioridad: "media",
        titulo: "Esa medida de cintura no cuadra",
        dato: `${dCm > 0 ? "+" : "−"}${un(Math.abs(dCm))} cm entre las dos últimas revisiones${dKg !== null ? ` con ${un(Math.abs(dKg))} kg de diferencia` : ""}.`,
        quehacer: "Casi seguro es la cinta puesta en otro sitio. Dile dónde medir —a la altura del ombligo, de pie, sin apretar— y vuelve a tomarla antes de darla por buena.",
        fuente: FUENTES.cintura,
      });
    } else if (Math.abs(dCm) < CINTURA.ruidoCm && dCm !== 0) {
      h.push({
        id: "cintura-ruido",
        prioridad: "info",
        titulo: "El cambio de cintura está dentro del margen de error",
        dato: `${un(Math.abs(dCm))} cm, y el error de medirse una misma llega a ${CINTURA.ruidoCm} cm.`,
        quehacer: "No sacar conclusiones de esto en ningún sentido. Mirar la tendencia de varias revisiones, no la última.",
        fuente: FUENTES.cintura,
      });
    }
  }

  // ---- Ciclo: no interpretar una subida en fase lútea -----------------------
  const ultima = revisiones[revisiones.length - 1];
  if (ultima && revisiones.length >= 2) {
    const delDia = d.habitos.find((x) => x.day === ultima.created_at.slice(0, 10));
    const ciclo = num(delDia?.cycle_day);
    const anterior = revisiones[revisiones.length - 2];
    const subio = (num(ultima.weight) ?? 0) > (num(anterior.weight) ?? 0);
    if (ciclo !== null && ciclo >= CICLO.luteaDesde && ciclo <= CICLO.luteaHasta && subio) {
      h.push({
        id: "ciclo-lutea",
        prioridad: "info",
        titulo: "Esa subida de peso puede ser del ciclo",
        dato: `Se pesó el día ${ciclo} de su ciclo, en fase lútea.`,
        quehacer: "En lútea retiene más agua y tiene más apetito. No cambies el plan por esta revisión: compárala con la del mismo punto del ciclo anterior.",
        fuente: FUENTES.ciclo,
      });
    }
  }

  return h.sort((x, y) => ORDEN[x.prioridad] - ORDEN[y.prioridad]);
}

/** Una línea de resumen para el listado de clientas. */
export function resumenCorto(hallazgos: Hallazgo[]): string {
  const altas = hallazgos.filter((x) => x.prioridad === "alta").length;
  const medias = hallazgos.filter((x) => x.prioridad === "media").length;
  if (altas > 0) return `${altas} cosa${altas === 1 ? "" : "s"} urgente${altas === 1 ? "" : "s"}`;
  if (medias > 0) return `${medias} ajuste${medias === 1 ? "" : "s"}`;
  return "Nada que tocar";
}
