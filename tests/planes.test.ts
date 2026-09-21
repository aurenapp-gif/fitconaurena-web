/**
 * Cuándo hay que volver a leer un plan, y cuándo no.
 *
 * Es una decisión de una línea con consecuencias grandes: si dice «hay que
 * leerlo» cuando no toca, la clienta se come diez o veinte segundos de espera
 * —y la lectura se paga otra vez— cada vez que abre su entreno, cada vez que
 * mira una comida y en cada pregunta a FitAI.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { lecturaGuardada, type PlanLeible } from "../lib/planes";

const plan = (extra: Partial<PlanLeible> = {}): PlanLeible => ({
  id: "p1", type: "nutricion", file_path: "nutricion-plan.pdf", ...extra,
});

test("un plan sin leer todavía pide lectura", () => {
  assert.equal(lecturaGuardada(plan()), null, "null es «nunca se ha intentado»");
});

test("un plan ya leído se reutiliza, no se relee", () => {
  const leido = lecturaGuardada(plan({
    contenido: "Desayuno: copos de avena 67 g",
    contenido_at: "2026-09-18T10:00:00Z",
  }));
  assert.ok(leido, "tiene lectura guardada");
  assert.match(leido.texto ?? "", /67 g/, "y se devuelve tal cual estaba");
});

test("un plan que no se dejó leer NO se vuelve a intentar", () => {
  const leido = lecturaGuardada(plan({ contenido: null, contenido_at: "2026-09-18T10:00:00Z" }));
  assert.deepEqual(
    leido, { estructura: null, texto: null },
    "hay fecha de lectura y no hay lectura: ese archivo no se deja entender"
  );
});

test("sin fecha de lectura se intenta, aunque no haya contenido", () => {
  assert.equal(
    lecturaGuardada(plan({ contenido: null, contenido_at: null })), null,
    "un fallo de red no deja fecha, y ese sí merece otra oportunidad"
  );
});
