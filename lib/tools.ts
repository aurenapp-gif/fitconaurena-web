/**
 * El interruptor de la sección de herramientas.
 *
 * Las herramientas en sí viven en lib/herramientas.ts; aquí solo queda si la
 * sección se enseña o no, que es lo que importó cuando hubo que apagarla.
 *
 * En septiembre de 2026 OpenAI retiró la opción de compartir GPT con otras
 * personas («Solo yo» es lo único que queda) y los tres enlaces dejaron de
 * abrirse. La sección estuvo con un aviso hasta que las herramientas pasaron a
 * vivir dentro de la app (lib/herramientas.ts), que además es mejor: un GPT
 * público no podía saber qué plan tenía cada clienta.
 *
 * Se deja el interruptor por si algún día hay que apagarlas otra vez.
 */
export const HERRAMIENTAS_ACTIVAS = true;

export const AVISO_HERRAMIENTAS =
  "Por motivos ajenos al programa, las herramientas están desactivadas por mantenimiento hasta que encontremos una solución. Te avisaremos en cuanto vuelvan a estar disponibles.";
