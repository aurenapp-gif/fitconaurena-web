/**
 * Quedarse sin saldo no es un fallo del programa.
 *
 * Llega como un 400 corriente, igual que un dato mal mandado, así que sin
 * mirarlo se confunde con un error nuestro y la clienta ve «vuelve a
 * preguntármelo» — y lo intenta veinte veces para nada. La diferencia importa:
 * esto no se arregla reintentando, se arregla recargando.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { esSinCredito, AVISO_SIN_IA, MODELO_CHARLA, MODELO_FOTO } from "../lib/ia";

/** Tal y como lo devuelve el SDK de Anthropic. */
const sinCredito = {
  status: 400,
  error: {
    type: "error",
    error: {
      type: "invalid_request_error",
      message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
    },
  },
};

test("se reconoce el 400 de «no queda saldo»", () => {
  assert.equal(esSinCredito(sinCredito), true);
});

test("un 400 cualquiera NO se confunde con quedarse sin saldo", () => {
  assert.equal(
    esSinCredito({ status: 400, error: { error: { message: "max_tokens: must be greater than 0" } } }),
    false,
    "eso sí es un fallo nuestro y hay que verlo en los registros"
  );
});

test("ni un corte de red ni una clave mal puesta", () => {
  assert.equal(esSinCredito({ status: 401, error: { error: { message: "invalid x-api-key" } } }), false);
  assert.equal(esSinCredito({ status: 429, error: { error: { message: "rate limit" } } }), false);
  assert.equal(esSinCredito(new Error("fetch failed")), false);
  assert.equal(esSinCredito(null), false);
  assert.equal(esSinCredito(undefined), false);
});

test("el aviso le dice a quién avisar, y no le echa la culpa", () => {
  assert.match(AVISO_SIN_IA, /coach/i, "ella no puede arreglarlo: tiene que saber a quién decírselo");
  assert.ok(!/error|fallo|técnico/i.test(AVISO_SIN_IA), "no se le suelta jerga");
});

test("cada cosa con su modelo", () => {
  assert.equal(MODELO_CHARLA, "claude-haiku-4-5", "la conversación es lo que más se usa: el barato");
  assert.equal(MODELO_FOTO, "claude-sonnet-5", "leer una carta o una nevera pide algo más");
});
