/**
 * Volver a leer un plan que quedó marcado como ilegible.
 *
 * La lectura se intenta UNA vez y, si falla, el plan queda marcado para no
 * releerlo en cada visita (tarda y cuesta). El efecto secundario era grave: un
 * fallo de una tarde condenaba el plan para siempre, la clienta veía «no he
 * podido sacar los ejercicios» cada vez y nadie más se enteraba.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const api = leer("app/api/miembros/clientas/plan/releer/route.ts");

test("la marca de ilegible se borra antes de volver a leer", () => {
  // Sin esto, `leerPlan` devuelve el vacío guardado y no intenta nada.
  assert.match(api, /\{ estructura: null, contenido: null, contenido_at: null \}/);
});

test("lo puede hacer el equipo, no una clienta", () => {
  assert.match(api, /!me \|\| !\(await puedeGestionarClientas\(me\)\)/);
});

test("dice cuántos ejercicios ha sacado, o que sigue sin poder", () => {
  assert.match(api, /ejercicios \{ejercicios === 1 \? "ejercicio" : "ejercicios"\}|ejercicios === 1 \? "ejercicio" : "ejercicios"/);
  assert.match(api, /Sigue sin poder leerse/);
});

test("el aviso solo sale cuando de verdad falló la lectura", () => {
  // Un plan recién subido todavía no tiene `contenido_at`: ahí no hay nada
  // que reintentar, solo hay que esperar a que alguien lo abra.
  const ficha = leer("app/miembros/clientas/[email]/page.tsx");
  assert.match(ficha, /p\.type === "entrenamiento" && !p\.estructura && p\.contenido_at/);
});
