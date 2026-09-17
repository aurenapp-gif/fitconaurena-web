/**
 * La coma decimal.
 *
 * Un móvil español pone coma en la tecla decimal. Con `type="number"` el
 * navegador la tira y «68,4» se guarda como 684: un peso imposible que pasa
 * la validación. Esto es lo que impide que vuelva a ocurrir.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { aPunto, filtraDecimal, filtraEntero, numero } from "../lib/numeros";

test("la coma es un separador decimal, no un dígito más", () => {
  assert.equal(aPunto("68,4"), "68.4");
  assert.equal(numero("68,4"), 68.4, "68,4 kg son 68,4 kg, no 684");
  assert.equal(numero("79,5"), 79.5);
  assert.equal(numero("68.4"), 68.4, "quien escriba el punto también acierta");
  assert.equal(numero(""), null);
  assert.equal(numero("  "), null);
  assert.equal(numero("mucho"), null);
});

test("se puede escribir el decimal letra a letra", () => {
  assert.equal(filtraDecimal("68"), "68");
  assert.equal(filtraDecimal("68,"), "68,", "si se borrara la coma no habría forma de escribir los decimales");
  assert.equal(filtraDecimal("68,4"), "68,4");
  assert.equal(filtraDecimal("68,4,5"), "68,45", "dos separadores no");
  assert.equal(filtraDecimal("68a4"), "684".replace("684", "684"));
  assert.equal(filtraDecimal("-68,4"), "68,4", "ni signos");
  assert.equal(filtraEntero("10.000"), "10000");
  assert.equal(filtraEntero("8 horas"), "8");
});
