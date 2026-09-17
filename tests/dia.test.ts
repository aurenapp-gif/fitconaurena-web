/**
 * Qué comida le toca hoy.
 *
 * El error que hay que impedir es enseñarle el lunes en domingo: se come otra
 * cosa creyendo que es la suya, y encima se fía.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { claveComida, comidasDeHoy, diaSemanaDe, resumenComida } from "../lib/dia";
import type { Comida, EstructuraNutricion } from "../lib/plan-estructura";

const comida = (nombre: string, alimento = "Avena", cantidad: string | null = "60 g"): Comida => ({
  nombre, momento: null, opciones: [{ etiqueta: null, items: [{ alimento, cantidad }] }],
});
const plan = (dias: { nombre: string; comidas: Comida[] }[]): EstructuraNutricion =>
  ({ tipo: "nutricion", dias, notas: [] });

test("se reconoce el día que nombra el plan", () => {
  assert.equal(diaSemanaDe("Lunes"), 1);
  assert.equal(diaSemanaDe("MIÉRCOLES"), 3, "con acento y en mayúsculas");
  assert.equal(diaSemanaDe("sábado y domingo"), 6, "manda el primero que nombra");
  assert.equal(diaSemanaDe("Vie"), 5, "abreviado también");
  assert.equal(diaSemanaDe("Todos los días"), null, "esto no es un día concreto");
  assert.equal(diaSemanaDe("Día A"), null);
  assert.equal(diaSemanaDe("Opción 1"), null);
});

test("un plan igual todos los días vale para cualquier fecha", () => {
  const p = plan([{ nombre: "Todos los días", comidas: [comida("Desayuno")] }]);
  for (const f of ["2026-09-14", "2026-09-17", "2026-09-20"]) {
    assert.equal(comidasDeHoy(p, f)?.comidas.length, 1, `también el ${f}`);
  }
});

test("un plan por días enseña EL de hoy, no otro", () => {
  const p = plan([
    { nombre: "Lunes", comidas: [comida("Desayuno", "Tostada")] },
    { nombre: "Jueves", comidas: [comida("Desayuno", "Avena")] },
  ]);
  // 2026-09-17 es jueves.
  assert.equal(comidasDeHoy(p, "2026-09-17")?.dia, "Jueves");
  assert.equal(comidasDeHoy(p, "2026-09-17")?.comidas[0].opciones[0].items[0].alimento, "Avena");
  // 2026-09-14 es lunes.
  assert.equal(comidasDeHoy(p, "2026-09-14")?.dia, "Lunes");
});

test("si hoy no está en su plan, no se le enseña el de otro día", () => {
  const p = plan([
    { nombre: "Lunes", comidas: [comida("Desayuno")] },
    { nombre: "Martes", comidas: [comida("Desayuno")] },
  ]);
  // 2026-09-20 es domingo: no está en el plan.
  assert.equal(comidasDeHoy(p, "2026-09-20"), null, "mejor decir que hoy no pone nada que mentir");
});

test("sin plan, nada", () => {
  assert.equal(comidasDeHoy(null, "2026-09-17"), null);
  assert.equal(comidasDeHoy(plan([]), "2026-09-17"), null);
});

test("el resumen de una comida se lee de un vistazo", () => {
  const c: Comida = { nombre: "Comida", momento: null, opciones: [{ etiqueta: null, items: [
    { alimento: "Pollo", cantidad: "154 g" }, { alimento: "Arroz", cantidad: "137 g" },
    { alimento: "Ensalada", cantidad: "libre" }, { alimento: "Aceite", cantidad: "11 ml" },
  ] }] };
  assert.equal(resumenComida(c), "Pollo 154 g, Arroz 137 g, Ensalada libre…");
});

test("lo marcado se guarda por nombre, no por posición", () => {
  assert.equal(claveComida("Desayuno"), claveComida("  DESAYUNO "));
  assert.equal(claveComida("Media mañana"), claveComida("media manana"), "con y sin acento es la misma");
  assert.notEqual(claveComida("Comida"), claveComida("Cena"));
});
