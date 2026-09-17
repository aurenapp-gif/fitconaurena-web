/**
 * Números escritos por una persona, en España, con un teclado de móvil.
 *
 * El teclado numérico español pone COMA como tecla decimal. Con
 * `<input type="number">` el navegador se la come sin avisar: teclear «68,4»
 * deja «684» en el campo, y ese 684 pasa la validación y se guarda como si
 * fuera un peso. Nadie ve el fallo hasta que la gráfica pega un salto.
 *
 * Por eso los campos decimales de la app son de texto con teclado numérico, y
 * la coma se traduce aquí, en un solo sitio.
 */

/** «68,4» → «68.4». Deja pasar lo que no sea un número para no borrar lo escrito. */
export function aPunto(texto: string): string {
  return texto.replace(",", ".").trim();
}

/**
 * Lo que la clienta puede teclear mientras escribe un decimal.
 *
 * Se filtra al vuelo para que no quepan letras ni dos separadores, pero se
 * admite la cadena a medias («68,») porque si no, no se puede escribir la
 * parte decimal: el campo se vaciaría al pulsar la coma.
 */
export function filtraDecimal(texto: string): string {
  const limpio = texto.replace(/[^\d.,]/g, "");
  const i = limpio.search(/[.,]/);
  if (i === -1) return limpio;
  return limpio.slice(0, i + 1) + limpio.slice(i + 1).replace(/[.,]/g, "");
}

/** Solo dígitos, para lo que no tiene decimales (pasos, repeticiones). */
export function filtraEntero(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** El número, o null si lo escrito no lo es. Acepta coma y punto. */
export function numero(texto: string): number | null {
  const t = aPunto(texto);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
