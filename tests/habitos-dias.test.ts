/**
 * Apuntar un día que se pasó.
 *
 * Lo importante aquí es el borde: ni el futuro ni medio año atrás. Dejar
 * rellenar meses convertiría la constancia —que es lo que mejor predice el
 * resultado— en un número que no significa nada.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DIAS_ATRAS, diasApuntables, sePuedeApuntar } from "../lib/habitos";

const HOY = "2026-10-02"; // viernes

test("salen hoy y los seis anteriores, del más antiguo al más reciente", () => {
  const d = diasApuntables(HOY, new Set());
  assert.equal(d.length, DIAS_ATRAS + 1);
  assert.equal(d[d.length - 1].fecha, HOY);
  assert.equal(d[d.length - 1].etiqueta, "Hoy");
  assert.equal(d[d.length - 2].etiqueta, "Ayer");
  assert.equal(d[0].fecha, "2026-09-26");
});

test("los días de más atrás se llaman por su nombre", () => {
  const d = diasApuntables(HOY, new Set());
  // 2026-09-30 fue un miércoles.
  assert.equal(d.find((x) => x.fecha === "2026-09-30")!.etiqueta, "Miércoles");
});

test("se marca cuáles ya tienen algo apuntado", () => {
  const d = diasApuntables(HOY, new Set(["2026-09-30", HOY]));
  assert.equal(d.find((x) => x.fecha === "2026-09-30")!.done, true);
  assert.equal(d.find((x) => x.fecha === "2026-10-01")!.done, false);
});

test("un lunes se puede llegar al domingo anterior", () => {
  // Con la semana natural, el domingo ya no se podría tocar.
  const lunes = "2026-10-05";
  const d = diasApuntables(lunes, new Set());
  assert.ok(d.some((x) => x.fecha === "2026-10-04"), "no llega al domingo");
});

test("el futuro no se apunta", () => {
  assert.equal(sePuedeApuntar("2026-10-03", HOY), false);
});

test("hoy y la última semana sí; más atrás no", () => {
  assert.equal(sePuedeApuntar(HOY, HOY), true);
  assert.equal(sePuedeApuntar("2026-09-26", HOY), true);
  assert.equal(sePuedeApuntar("2026-09-25", HOY), false);
  assert.equal(sePuedeApuntar("2026-06-01", HOY), false);
});

test("una fecha con mala pinta no cuela", () => {
  assert.equal(sePuedeApuntar("ayer", HOY), false);
  assert.equal(sePuedeApuntar("2026-13-40", HOY), false);
  assert.equal(sePuedeApuntar("", HOY), false);
});

/* ---- El entreno, un hábito más ------------------------------------------ */

import { readFileSync } from "node:fs";
import { join } from "node:path";
const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");

test("el entreno se guarda junto al ciclo y la energía, no con el agua", () => {
  // Las tres son columnas que pueden no existir todavía. Si `trained` fuera
  // con el agua y la columna faltara, un día entero de hábitos se perdería
  // por una migración sin ejecutar.
  const api = leer("app/api/miembros/habitos/route.ts");
  const extra = api.slice(api.indexOf("const extra = {"), api.indexOf("try {", api.indexOf("const extra = {")));
  assert.match(extra, /trained/);
  // Solo el objeto, no el comentario que viene después.
  const desde = api.indexOf("const fila = {");
  const fila = api.slice(desde, api.indexOf("};", desde));
  assert.ok(!/trained/.test(fila), "trained no puede ir en la fila que siempre se guarda");
});

test("solo se guarda un sí o un no, nunca lo que llegue", () => {
  const api = leer("app/api/miembros/habitos/route.ts");
  assert.match(api, /typeof body\.trained === "boolean" \? body\.trained : null/);
});

test("si ya apuntó pesos ese día, no se le pregunta dos veces", () => {
  const tracker = leer("components/HabitsTracker.tsx");
  assert.match(tracker, /entrenosApuntados/);
  assert.match(tracker, /deMiEntreno\.has\(fecha\)/);
});
