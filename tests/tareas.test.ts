/**
 * Tareas del equipo: lo que hay que hacer cada día y quién lo ha hecho.
 *
 * La tarea se escribe una vez y vale para todos los días; lo que cambia a
 * diario es si se hizo. De ahí las dos tablas.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { porPrioridad, tareasDe, cuentaDelDia, type Tarea } from "../lib/tareas";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");

const t = (id: string, extra: Partial<Tarea> = {}): Tarea => ({
  id, titulo: id, detalle: null, asignado_a: null, prioridad: 100,
  activa: true, created_at: "2026-11-15T10:00:00Z", ...extra,
});

test("manda la prioridad, y a igualdad la más antigua", () => {
  const orden = porPrioridad([
    t("c", { prioridad: 30 }),
    t("a", { prioridad: 10 }),
    t("b", { prioridad: 10, created_at: "2026-11-14T10:00:00Z" }),
  ]).map((x) => x.id);
  assert.deepEqual(orden, ["b", "a", "c"]);
});

test("una tarea sin asignar es de todos, no de nadie", () => {
  // Escribir una y olvidarse de asignarla la dejaría invisible, que es el
  // peor resultado posible.
  const lista = [t("suya", { asignado_a: "nico@x.com" }), t("comun"), t("otra", { asignado_a: "ana@x.com" })];
  assert.deepEqual(tareasDe(lista, "nico@x.com").map((x) => x.id), ["suya", "comun"]);
  assert.deepEqual(tareasDe(lista, "ana@x.com").map((x) => x.id), ["comun", "otra"]);
});

test("el correo no distingue mayúsculas", () => {
  assert.equal(tareasDe([t("x", { asignado_a: "Nico@X.com" })], "nico@x.com").length, 1);
});

test("una tarea retirada deja de salir", () => {
  assert.equal(tareasDe([t("vieja", { activa: false })], "nico@x.com").length, 0);
});

test("cuenta lo hecho sobre lo suyo, no sobre todo", () => {
  const lista = [t("a"), t("b"), t("de-otra", { asignado_a: "ana@x.com" })];
  const c = cuentaDelDia(lista, [{ task_id: "a", email: "nico@x.com", dia: "2026-11-15" }], "nico@x.com", "2026-11-15");
  assert.deepEqual(c, { hechas: 1, total: 2 });
});

test("lo de ayer no cuenta como hecho hoy", () => {
  const c = cuentaDelDia([t("a")], [{ task_id: "a", email: "nico@x.com", dia: "2026-11-14" }], "nico@x.com", "2026-11-15");
  assert.equal(c.hechas, 0);
});

test("el día lo pone el servidor, no quien llama", () => {
  // Si viniera de fuera se podría marcar como hecho ayer algo que no se hizo,
  // y el registro dejaría de valer para nada.
  const ruta = leer("app/api/miembros/tareas/hecho/route.ts");
  assert.match(ruta, /const dia = hoyMadrid\(\);/);
  assert.doesNotMatch(ruta, /b\.dia|body\.dia/);
});

test("poner tareas es solo de la coach; marcarlas, del equipo", () => {
  assert.match(leer("app/api/miembros/tareas/route.ts"), /return me && isAdmin\(me\) \? me : null;/);
  const hecho = leer("app/api/miembros/tareas/hecho/route.ts");
  assert.match(hecho, /if \(!isAdmin\(me\) && !\(await esEquipo\(me\)\)\)/);
});

test("retirar una tarea no borra lo que ya marcaron", () => {
  assert.match(leer("app/api/miembros/tareas/route.ts"), /sbUpdate\("staff_tasks", `id=eq\.\$\{id\}`, \{ activa: false \}\)/);
});

test("el SQL de las tareas va en el fichero que se ejecuta de una vez", () => {
  const pendiente = leer("supabase/00-PENDIENTE.sql");
  for (const o of ["staff_tasks", "staff_task_done"]) {
    assert.ok(pendiente.includes(o), `falta ${o} en 00-PENDIENTE.sql`);
  }
});
