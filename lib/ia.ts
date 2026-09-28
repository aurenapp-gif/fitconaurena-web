/**
 * Lo que comparten FitAI y las herramientas: qué modelo usa cada cosa y qué
 * decirle a una clienta cuando la IA no puede contestar.
 *
 * QUÉ MODELO Y POR QUÉ. No hace falta el modelo más caro para responder «¿cada
 * cuánto me cambian el plan?». Se paga por palabra leída y escrita, así que
 * poner el modelo grande en lo que se usa cien veces al día es tirar el dinero
 * en el sitio exacto donde más se nota.
 *
 *   · Conversación (FitAI)  → Haiku.  Preguntas cortas, respuestas cortas.
 *   · Fotos (herramientas)  → Sonnet. Hay que LEER una carta o una nevera;
 *                             equivocarse de plato se ve enseguida.
 *   · Leer un plan          → Opus.   Aquí se copian gramos y kilos que alguien
 *                             se va a comer o levantar. Un 120 donde ponía 220
 *                             no se nota hasta que es tarde, y además se hace
 *                             UNA vez por plan: es lo barato de todo esto.
 */

/** Conversación con FitAI. El volumen está aquí. */
export const MODELO_CHARLA = "claude-haiku-4-5";
/** Herramientas con foto: hay que leer lo que se ve. */
export const MODELO_FOTO = "claude-sonnet-5";

/**
 * ¿Es que se ha acabado el saldo de la cuenta de Anthropic?
 *
 * Llega como un 400 corriente, así que sin mirarlo se confunde con un fallo
 * del programa. Y la diferencia importa: esto no se arregla reintentando, se
 * arregla recargando.
 */
export function esSinCredito(err: unknown): boolean {
  const e = err as { status?: number; error?: { error?: { message?: string } }; message?: string };
  const texto = e?.error?.error?.message ?? e?.message ?? "";
  return e?.status === 400 && /credit balance is too low/i.test(texto);
}

/** Lo que ve la clienta cuando la IA no está disponible. */
export const AVISO_SIN_IA =
  "FitAI está en pausa ahora mismo. No es cosa tuya: díselo a tu coach y lo activa enseguida.";
