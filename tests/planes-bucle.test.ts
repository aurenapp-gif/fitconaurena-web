/**
 * Que una lectura fallida no se repita para siempre.
 *
 * En los registros de producción el mismo plan aparece intentado OCHO veces en
 * cuatro días. La causa: marcar el plan es lo único que frena el reintento, y
 * el `catch` final no marcaba. Un plan que fallara por excepción se releía
 * entero —Opus más el PDF— en cada visita suya y en cada pregunta a FitAI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const planes = readFileSync(join(import.meta.dirname ?? ".", "..", "lib/planes.ts"), "utf8");

test("un fallo al leer deja de reintentarse solo", () => {
  assert.match(planes, /if \(!esPasajero\(e\)\) await marcaIlegible\(plan\.id\);/);
});

test("salvo que sea pasajero, que ni se cobra ni se arregla marcando", () => {
  // Sin crédito, 429 y 5xx los rechaza el servidor antes de generar nada.
  assert.match(planes, /if \(esSinCredito\(err\)\) return true;/);
  assert.match(planes, /s === 429 \|\| \(typeof s === "number" && s >= 500\)/);
});

test("la lectura corta antes de que Vercel mate la función", () => {
  // A los 60 s Vercel mata la función entera y el catch no llega a correr: el
  // plan se quedaba sin marcar y volvía a releerse.
  assert.match(planes, /const TOPE_LECTURA_MS = 45_000;/);
  assert.match(planes, /\}, \{ timeout: TOPE_LECTURA_MS \}\);/);
});
