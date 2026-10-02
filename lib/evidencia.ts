/**
 * Los umbrales del analizador, con el estudio del que sale cada uno.
 *
 * Van aquí y no sueltos por el código a propósito: cuando la coach lee «le
 * faltan series de glúteo», tiene que poder ver POR QUÉ diez y no seis, y
 * cambiarlo en un sitio si mañana sale algo mejor. Un número sin fuente es una
 * opinión disfrazada de dato.
 *
 * Nada de esto sustituye el criterio de la coach: son los límites a partir de
 * los cuales merece la pena mirar, no órdenes.
 */

export type Fuente = {
  clave: string;
  /** Cómo citarlo en pantalla, en una línea. */
  cita: string;
  url: string;
};

export const FUENTES: Record<string, Fuente> = {
  ritmo: {
    clave: "ritmo",
    cita: "Ruiz-Castellano et al. (2021), Nutrients — revisión sobre fases de pérdida de grasa en personas que entrenan fuerza",
    url: "https://www.mdpi.com/2072-6643/13/9/3255",
  },
  ritmoFuerza: {
    clave: "ritmoFuerza",
    cita: "Garthe et al. (2011), Int J Sport Nutr Exerc Metab — perder 1 kg/semana frente a 0,5 en deportistas",
    url: "https://pubmed.ncbi.nlm.nih.gov/21558571/",
  },
  proteina: {
    clave: "proteina",
    cita: "Hudson et al. / recomendaciones para deportistas en déficit — 1,6–2,2 g/kg al día",
    url: "https://journals.humankinetics.com/view/journals/ijsnem/28/2/article-p170.xml",
  },
  volumen: {
    clave: "volumen",
    cita: "Schoenfeld et al. — revisión paraguas sobre volumen semanal e hipertrofia",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9302196/",
  },
  pasos: {
    clave: "pasos",
    cita: "Metaanálisis de 14 ensayos (2026) — unos 8.500 pasos al día y +1,1–1,3 % por cada 1.000 más",
    url: "https://www.sciencedaily.com/releases/2026/05/260510234655.htm",
  },
  sueno: {
    clave: "sueno",
    cita: "Nedeltcheva et al. (2010), Ann Intern Med — 5,5 h frente a 8,5 h con el mismo déficit",
    url: "https://www.acpjournals.org/doi/abs/10.7326/0003-4819-153-7-201010050-00006",
  },
  constancia: {
    clave: "constancia",
    cita: "Burke et al. (2011), J Am Diet Assoc — revisión de 22 estudios sobre autorregistro y pérdida de peso",
    url: "https://pubmed.ncbi.nlm.nih.gov/21185970/",
  },
  descanso: {
    clave: "descanso",
    cita: "Byrne et al. (2018), Int J Obes — estudio MATADOR: 2 semanas de déficit alternadas con 2 de mantenimiento",
    url: "https://www.nature.com/articles/ijo2017206",
  },
  ciclo: {
    clave: "ciclo",
    cita: "Revisión narrativa sobre fases del ciclo menstrual, rendimiento y apetito",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12747961/",
  },
  cintura: {
    clave: "cintura",
    cita: "Verweij et al. (2013), Public Health Nutr — error de medición de la cintura",
    url: "https://pubmed.ncbi.nlm.nih.gov/22626254/",
  },
};

/** Velocidad de pérdida, en % del peso corporal por semana. */
export const RITMO = {
  /** Por encima de esto se pierde fuerza y masa magra. */
  demasiadoRapido: 1.0,
  /** Por debajo de esto, durante varias semanas, está parada. */
  estancada: 0.25,
  /** El rango donde conviene estar. */
  minBueno: 0.4,
  maxBueno: 0.75,
  /** Semanas mínimas de datos para decir algo del ritmo. */
  semanasMinimas: 3,
};

/** Proteína, en gramos por kilo de peso corporal y día. */
export const PROTEINA = { minimo: 1.6, maximo: 2.2 };

/** Fuerza: series efectivas por grupo muscular y semana. */
export const VOLUMEN = {
  /** Por debajo de esto el estímulo se queda corto. */
  minimoSemanal: 10,
  /** Sesiones por grupo y semana. */
  frecuenciaMinima: 2,
  /** Semanas sin mejorar peso×repeticiones antes de tocar el estímulo. */
  semanasSinProgresar: 4,
};

/** Pasos diarios de media. */
export const PASOS = { objetivo: 8500, bajo: 7000 };

/** Sueño, en horas de media. */
export const SUENO = { minimo: 7, critico: 6 };

/** Constancia: días con algo apuntado por semana. */
export const CONSTANCIA = { minimoSemanal: 3 };

/** Descanso metabólico (MATADOR). */
export const DESCANSO = {
  /** Semanas seguidas en déficit a partir de las cuales conviene plantearlo. */
  semanasSeguidas: 14,
  /** Lo que dura el descanso. */
  semanasDescanso: 2,
};

/**
 * Cintura. El error de medirse uno mismo llega a un par de centímetros, así
 * que por debajo de eso no hay señal, y un salto enorme sin cambio de peso es
 * casi siempre la cinta mal puesta, no el cuerpo.
 */
export const CINTURA = { ruidoCm: 2, saltoImposibleCm: 5, pesoQueLoJustifica: 2 };

/** Días del ciclo en los que toca no interpretar una subida de peso. */
export const CICLO = { luteaDesde: 15, luteaHasta: 28 };
