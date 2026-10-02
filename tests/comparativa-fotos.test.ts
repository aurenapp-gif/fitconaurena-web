/**
 * La primera foto de cada ángulo frente a la última.
 *
 * El caso que de verdad importa: las tres fotos son opcionales en cada
 * revisión, así que «la primera» no es la misma fecha para todos los ángulos.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comparacionDeFotos, textoPeriodo, textoDelta, type RevisionConFotos,
} from "../lib/comparativa-fotos";

const r = (d: string, extra: Partial<RevisionConFotos> = {}): RevisionConFotos =>
  ({ created_at: `${d}T10:00:00Z`, ...extra });

test("sin revisiones no hay nada que comparar", () => {
  const c = comparacionDeFotos([]);
  assert.equal(c.pares.length, 0);
  assert.deepEqual(c.sinNinguna, ["frente", "perfil", "espaldas"]);
});

test("con una sola foto de un ángulo todavía no se compara", () => {
  const c = comparacionDeFotos([r("2026-06-01", { photo_front: "a.jpg" })]);
  assert.equal(c.pares.length, 0);
  assert.deepEqual(c.soloUna, ["frente"]);
  assert.deepEqual(c.sinNinguna, ["perfil", "espaldas"]);
});

test("coge la primera y la última de cada ángulo, no la primera revisión", () => {
  const c = comparacionDeFotos([
    r("2026-06-01", { photo_front: "f1.jpg" }),                        // sin espaldas
    r("2026-07-01", { photo_front: "f2.jpg", photo_back: "e1.jpg" }),  // empieza de espaldas
    r("2026-10-01", { photo_front: "f3.jpg", photo_back: "e2.jpg" }),
  ]);
  const frente = c.pares.find((p) => p.id === "frente")!;
  const espaldas = c.pares.find((p) => p.id === "espaldas")!;
  assert.equal(frente.primera.path, "f1.jpg");
  assert.equal(frente.ultima.path, "f3.jpg");
  // De espaldas la primera es la de julio, que es la primera que hay.
  assert.equal(espaldas.primera.path, "e1.jpg");
  assert.equal(espaldas.ultima.path, "e2.jpg");
  assert.deepEqual(c.soloUna, []);
  assert.deepEqual(c.sinNinguna, ["perfil"]);
});

test("las revisiones desordenadas se ordenan por fecha", () => {
  const c = comparacionDeFotos([
    r("2026-10-01", { photo_front: "ultima.jpg" }),
    r("2026-06-01", { photo_front: "primera.jpg" }),
    r("2026-08-01", { photo_front: "media.jpg" }),
  ]);
  assert.equal(c.pares[0].primera.path, "primera.jpg");
  assert.equal(c.pares[0].ultima.path, "ultima.jpg");
});

test("el peso y la cintura son la diferencia entre ESAS dos fotos", () => {
  const c = comparacionDeFotos([
    r("2026-06-01", { photo_front: "a.jpg", weight: 72.4, waist: 84 }),
    r("2026-10-01", { photo_front: "b.jpg", weight: "68.2", waist: "78.5" }),
  ]);
  assert.equal(c.pares[0].peso, -4.2);
  assert.equal(c.pares[0].cintura, -5.5);
  assert.equal(c.pares[0].dias, 122);
});

test("si falta un peso no se inventa la diferencia", () => {
  const c = comparacionDeFotos([
    r("2026-06-01", { photo_front: "a.jpg", waist: 84 }),
    r("2026-10-01", { photo_front: "b.jpg", weight: 68, waist: 80 }),
  ]);
  assert.equal(c.pares[0].peso, null);
  assert.equal(c.pares[0].cintura, -4);
  assert.equal(c.pares[0].primera.peso, null);
  assert.equal(c.pares[0].ultima.peso, 68);
});

test("una ruta vacía no cuenta como foto", () => {
  const c = comparacionDeFotos([
    r("2026-06-01", { photo_front: "" }),
    r("2026-07-01", { photo_front: "   " }),
    r("2026-10-01", { photo_front: "b.jpg" }),
  ]);
  assert.equal(c.pares.length, 0);
  assert.deepEqual(c.soloUna, ["frente"]);
});

test("el periodo se dice en días, meses o años", () => {
  assert.equal(textoPeriodo(0), "el mismo día");
  assert.equal(textoPeriodo(1), "1 día");
  assert.equal(textoPeriodo(28), "28 días");
  assert.equal(textoPeriodo(122), "4 meses");
  assert.equal(textoPeriodo(365), "1 año");
  assert.equal(textoPeriodo(400), "1 año y 1 mes");
});

test("el signo se ve, que es lo que importa", () => {
  assert.equal(textoDelta(-4.2, "kg"), "−4,2 kg");
  assert.equal(textoDelta(1.5, "cm"), "+1,5 cm");
});
