/**
 * La cola de respuesta.
 *
 * El dato que la motiva: en la auditoría de octubre había 15 revisiones
 * esperando respuesta, repartidas por fecha entre las ya contestadas. Una
 * mujer que sube tres fotos y un peso y no recibe nada sube la siguiente
 * peor, y la tercera no la sube. Esto se rompe en silencio, así que lo
 * sujetan pruebas.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const pagina = leer("app/miembros/checkins/page.tsx");

test("sin responder van primero, y las más viejas arriba", () => {
  assert.match(pagina, /const porResponder = enCola/);
  assert.match(pagina, /filter\(\(i\) => !i\.coach_reply\)\.sort\(\(a, b\) => a\.created_at\.localeCompare\(b\.created_at\)\)/);
  assert.match(pagina, /\[\.\.\.porResponder, \.\.\.yaRespondidas\]\.map/);
});

test("la cola es solo para la coach, y solo cuando no está mirando a una clienta", () => {
  // Con una clienta elegida el orden es el suyo, cronológico: ahí se lee su
  // historia, no se despacha trabajo.
  assert.match(pagina, /const enCola = admin && !filtrada;/);
});

test("cada una que espera dice cuántos días lleva", () => {
  assert.match(pagina, /const diasEsperando = \(iso: string\)/);
  assert.match(pagina, /espera \$\{diasEsperando\(it\.created_at\)\} días/);
});

test("a la clienta se le promete respuesta, y en los dos sitios", () => {
  // Al enviarla y en la tarjeta de estado: si no sabe cuándo le contestan,
  // no vuelve.
  assert.match(leer("components/CheckinForm.tsx"), /responde en menos de 48 h/);
  assert.match(pagina, /responde en menos de 48 h/);
});
