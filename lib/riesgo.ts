/**
 * Quién está a punto de irse, y por qué.
 *
 * Una clienta no se cae el día que pide la baja: se cae semanas antes, y deja
 * rastro. En los datos de octubre las seis que nunca habían subido una
 * revisión eran también las de menos días de uso, y dos recién dadas de alta
 * llevaban días pagando sin plan. Eso se puede ver antes de que pase.
 *
 * Las reglas son deliberadamente pocas y explicables: cada aviso dice en
 * castellano por qué salta, porque un número de riesgo que nadie entiende no
 * se usa. Y ninguna se dispara sola el primer día: a una recién llegada no se
 * la marca como perdida por no haber apuntado todavía.
 */

export type Nivel = "alto" | "medio" | "ok";

export type Senales = {
  /** Planes que tiene subidos. 0 = ha pagado y no tiene nada. */
  planes: number;
  /** Revisiones subidas en toda su historia. */
  revisiones: number;
  /** Días desde la última vez que apuntó algo. null = no ha apuntado nunca. */
  diasSinApuntar: number | null;
  /** Días desde su última revisión. null = nunca ha subido ninguna. */
  diasSinRevision: number | null;
  /** Días que lleva en el programa. Protege a las recién llegadas. */
  diasDeAlta: number;
};

export type Riesgo = { nivel: Nivel; motivos: string[]; puntos: number };

/** Margen de cortesía para una recién llegada, en días. */
const GRACIA = 3;

export function riesgoDe(s: Senales): Riesgo {
  const motivos: string[] = [];
  let puntos = 0;

  // Ha pagado y no tiene plan. Es lo más grave que puede pasar en la primera
  // semana, y lo único que depende enteramente de nosotros.
  if (s.planes === 0 && s.diasDeAlta >= 2) {
    motivos.push(`${s.diasDeAlta} días dada de alta y sin plan`);
    puntos += 100;
  }

  // Nunca ha subido una revisión, pasada ya la primera quincena.
  if (s.revisiones === 0 && s.diasDeAlta >= 16) {
    motivos.push("no ha subido ninguna revisión");
    puntos += 60;
  }

  // Dejó de subir revisiones.
  if (s.diasSinRevision != null && s.diasSinRevision >= 30) {
    motivos.push(`${s.diasSinRevision} días sin subir revisión`);
    puntos += 50;
  } else if (s.diasSinRevision != null && s.diasSinRevision >= 20) {
    motivos.push(`${s.diasSinRevision} días sin subir revisión`);
    puntos += 25;
  }

  // Dejó de apuntar. Es la señal más temprana de todas.
  if (s.diasDeAlta > GRACIA) {
    if (s.diasSinApuntar == null && s.diasDeAlta >= 10) {
      motivos.push("no ha apuntado un solo día");
      puntos += 40;
    } else if (s.diasSinApuntar != null && s.diasSinApuntar >= 10) {
      motivos.push(`${s.diasSinApuntar} días sin apuntar nada`);
      puntos += 35;
    } else if (s.diasSinApuntar != null && s.diasSinApuntar >= 6) {
      motivos.push(`${s.diasSinApuntar} días sin apuntar nada`);
      puntos += 15;
    }
  }

  const nivel: Nivel = puntos >= 50 ? "alto" : puntos >= 15 ? "medio" : "ok";
  return { nivel, motivos, puntos };
}

/** Las que peor están, primero. Las que van bien no salen. */
export function enRiesgo<T extends { riesgo: Riesgo }>(filas: T[], tope = 6): T[] {
  return filas
    .filter((f) => f.riesgo.nivel !== "ok")
    .sort((a, b) => b.riesgo.puntos - a.riesgo.puntos)
    .slice(0, tope);
}

/** Días enteros entre dos fechas ISO (YYYY-MM-DD). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.max(0, Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000));
}
