/**
 * Las estrellas de la revisión: de 1 a 5, cómo de contenta está.
 *
 * Dos cosas que no se pueden romper: que una estrella rara no tumbe la
 * revisión entera, y que si la columna todavía no existe en la base se
 * guarde igual todo lo demás. Perder las fotos y el peso de una clienta por
 * un dato opcional sería el peor cambio posible.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const api = leer("app/api/miembros/checkin/route.ts");
const form = leer("components/CheckinForm.tsx");

test("solo entra un entero del 1 al 5", () => {
  assert.match(api, /Number\.isInteger\(ratingRaw\) && ratingRaw >= 1 && ratingRaw <= 5 \? ratingRaw : null/);
});

test("un valor raro no rechaza la revisión: simplemente no hay estrellas", () => {
  // No hay ningún return de error asociado al rating.
  const trozo = api.slice(api.indexOf("const ratingRaw"), api.indexOf("const badPhoto"));
  assert.ok(!/NextResponse\.json\(\{ error/.test(trozo), "el rating no puede devolver error");
});

test("si la columna no existe todavía, la revisión se guarda igual", () => {
  // Las estrellas viajan con el resto de lo opcional, y si el guardado falla
  // se reintenta sin nada de eso.
  assert.match(api, /const conEstrellas = rating != null \? \{ rating \} : \{\}/);
  assert.match(api, /const opcionales = \{[^}]*conEstrellas/);
  assert.match(api, /let dropped = Object\.keys\(opcionales\)\.length > 0;/);
});

test("con las estrellas solas ya se puede enviar la revisión", () => {
  // Si alguien solo quiere decir que está regular, que pueda decirlo.
  assert.match(form, /entrenoLleno\.length === 0 && estrellas == null/);
});

test("al enviarla, las estrellas se limpian como todo lo demás", () => {
  assert.match(form, /setEstrellas\(null\);/);
});

test("poca puntuación pide explicación en vez de quedarse callada", () => {
  assert.match(form, /cuéntame abajo qué está fallando/);
});

test("la coach las ve en la lista de revisiones", () => {
  const pagina = leer("app/miembros/checkins/page.tsx");
  assert.match(pagina, /<Estrellas n=\{it\.rating\}/);
  assert.match(pagina, /Poco contenta: míralo/);
});
