import { test } from "node:test";
import assert from "node:assert/strict";
import { elegirPlan, nombrePlan, ordenSelector, type PlanResumen } from "../lib/entreno-planes";

const f1: PlanResumen = { id: "a", title: "Fase 1", created_at: "2026-09-01T10:00:00Z" };
const f2: PlanResumen = { id: "b", title: "Fase 2", created_at: "2026-10-01T10:00:00Z" };
const planes = [f2, f1];

test("sin nada elegido abre el más reciente", () => {
  assert.equal(elegirPlan(planes, {})?.id, "b");
});

test("respeta el plan pedido", () => {
  assert.equal(elegirPlan(planes, { pedido: "a" })?.id, "a");
});

test("recuerda el último elegido", () => {
  assert.equal(elegirPlan(planes, { recordado: "a" })?.id, "a");
});

test("con un entreno a medias manda el plan de ese entreno", () => {
  assert.equal(elegirPlan(planes, { sesion: "b", pedido: "a", recordado: "a" })?.id, "b");
});

test("ignora ids que no son suyos", () => {
  assert.equal(elegirPlan(planes, { pedido: "de-otra", recordado: "x" })?.id, "b");
});

test("sin planes no hay plan", () => {
  assert.equal(elegirPlan([], { pedido: "a" }), null);
});

test("el selector va de la fase más antigua a la más nueva", () => {
  assert.deepEqual(ordenSelector(planes).map((p) => p.title), ["Fase 1", "Fase 2"]);
});

test("un plan sin título se nombra por su fecha", () => {
  assert.match(nombrePlan({ id: "c", title: "  ", created_at: "2026-10-05T10:00:00Z" }), /^Plan del 5/);
  assert.equal(nombrePlan(f1), "Fase 1");
});
