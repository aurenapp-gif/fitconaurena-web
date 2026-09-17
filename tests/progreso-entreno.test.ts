/**
 * En qué avanza y en qué no.
 *
 * Lo que se prueba aquí es que no se le diga que ha mejorado cuando no, ni que
 * se ha estancado cuando lo que pasa es que acaba de empezar.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { avancePorEjercicio, e1rm, textoAvance } from "../lib/progreso-entreno";
import type { SerieGuardada } from "../lib/entrenos";

const s = (ejercicio: string, peso: number | null, reps: number | null, created_at: string): SerieGuardada =>
  ({ ejercicio, serie: 1, peso, reps, created_at });

test("con un solo día no hay avance que medir", () => {
  const r = avancePorEjercicio([s("Sentadilla", 40, 8, "2026-09-10T10:00:00Z")]);
  assert.deepEqual(r, [], "enseñar «+0 %» a quien acaba de empezar parece un suspenso");
});

test("el avance sale de la carga estimada, no del peso a secas", () => {
  // 40×8 → 1RM ≈ 50,7. 45×5 → ≈ 52,5. Sube poco aunque el peso suba 5 kg.
  const r = avancePorEjercicio([
    s("Sentadilla", 40, 8, "2026-09-01T10:00:00Z"),
    s("Sentadilla", 45, 5, "2026-09-15T10:00:00Z"),
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].kilos, 5, "cinco kilos más de carga");
  assert.ok(r[0].pct > 0 && r[0].pct < 8, `pero solo un ${r[0].pct} % de avance real, no un 12 %`);
});

test("de cada día cuenta su mejor serie", () => {
  const r = avancePorEjercicio([
    s("Prensa", 60, 12, "2026-09-01T10:00:00Z"),
    s("Prensa", 70, 12, "2026-09-01T10:10:00Z"),
    s("Prensa", 50, 12, "2026-09-01T10:20:00Z"),
    s("Prensa", 80, 12, "2026-09-15T10:00:00Z"),
  ]);
  assert.equal(r[0].desde.peso, 70, "del primer día, la más pesada");
  assert.equal(r[0].hasta.peso, 80);
  assert.equal(r[0].sesiones, 2);
});

test("se ordena del que más sube al que menos", () => {
  const r = avancePorEjercicio([
    s("Gemelo", 30, 15, "2026-09-01T10:00:00Z"),
    s("Gemelo", 31, 15, "2026-09-15T10:00:00Z"),
    s("Sentadilla", 40, 8, "2026-09-01T10:00:00Z"),
    s("Sentadilla", 55, 8, "2026-09-15T10:00:00Z"),
  ]);
  assert.equal(r[0].nombre, "Sentadilla");
  assert.equal(r[1].nombre, "Gemelo");
  assert.ok(r[0].pct > r[1].pct);
});

test("una bajada se dice, no se esconde", () => {
  const r = avancePorEjercicio([
    s("Peso muerto", 60, 10, "2026-09-01T10:00:00Z"),
    s("Peso muerto", 50, 10, "2026-09-15T10:00:00Z"),
  ]);
  assert.ok(r[0].pct < 0);
  assert.match(textoAvance(r[0].pct), /−/, "con el menos tipográfico");
});

test("las series sin peso o sin repeticiones no cuentan", () => {
  const r = avancePorEjercicio([
    s("Plancha", null, null, "2026-09-01T10:00:00Z"),
    s("Plancha", null, 40, "2026-09-15T10:00:00Z"),
  ]);
  assert.deepEqual(r, []);
});

test("cómo se lee", () => {
  assert.equal(textoAvance(35), "+35 %");
  assert.equal(textoAvance(0), "igual");
  assert.equal(textoAvance(-4), "−4 %");
  assert.equal(Math.round(e1rm(40, 8) * 10) / 10, 50.7);
});
