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
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { esSinCredito, AVISO_SIN_IA, MODELO_CHARLA, MODELO_FOTO } from "../lib/ia";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");

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
  assert.equal(MODELO_CHARLA, "claude-haiku-5-5", "la conversación es lo que más se usa: el barato");
  assert.equal(MODELO_FOTO, "claude-sonnet-5", "leer una carta o una nevera pide algo más");
});

test("la charla va con esfuerzo bajo y con holgura para pensar", () => {
  // Haiku 5.5 piensa de serie, y ese pensamiento sale del mismo cupo que la
  // respuesta: con los mil tokens de antes se quedaba sin sitio para
  // contestar justo en las preguntas difíciles.
  const ruta = leer("app/api/miembros/fitai/route.ts");
  assert.match(ruta, /max_tokens: 2000,/);
  assert.match(ruta, /output_config: \{ effort: "low" \},/);
});

test("el bloque común de FitAI se guarda una hora", () => {
  // Es idéntico para todas: se escribe una vez y se lee cientos de veces.
  const ruta = leer("app/api/miembros/fitai/route.ts");
  assert.match(ruta, /sistemaEstable\(coach\), cache_control: \{ type: "ephemeral", ttl: "1h" \}/);
  // El de cada clienta NO: ese solo se reaprovecha en su conversación.
  assert.match(ruta, /contexto\(datos\), cache_control: \{ type: "ephemeral" \}/);
});

test("leer un plan pide el esfuerzo a mano, no el que venga de serie", () => {
  // Opus 5 venía en «alto» y el 5.5 en «medio»: sin decirlo, el cambio de
  // modelo habría bajado en silencio el cuidado con que se copian gramos.
  const planes = leer("lib/planes.ts");
  assert.match(planes, /const MODELO_LECTURA = "claude-opus-5-5";/);
  assert.match(planes, /effort: "high",/);
});
