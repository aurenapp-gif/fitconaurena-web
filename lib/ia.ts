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

/**
 * Conversación con FitAI. El volumen está aquí.
 *
 * Haiku 5.5 cuesta 0,10 $ / 0,50 $ por millón de palabras, contra 1 $ / 5 $ del
 * 4.5: una décima parte. El mismo texto cuenta ~30% más tokens en esta
 * generación, así que el ahorro real ronda el 85%, no el 90%.
 *
 * Trae pensamiento adaptativo ENCENDIDO de serie, que el 4.5 no tenía. Para
 * tres frases no hace falta: en la llamada se pide esfuerzo bajo y se deja
 * holgura de tokens, que si no el pensamiento se come la respuesta.
 */
export const MODELO_CHARLA = "claude-haiku-5-5";
/**
 * Herramientas con foto: hay que leer lo que se ve.
 *
 * Se queda en Sonnet 5 A PROPÓSITO. El 5.5 cuesta exactamente lo mismo, así
 * que no ahorra nada, y recalibra los niveles de esfuerzo: el «bajo» que usa
 * esta llamada no significa lo mismo en los dos. Cambiarlo sería arriesgar
 * que lea mal una carta a cambio de cero euros.
 */
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
