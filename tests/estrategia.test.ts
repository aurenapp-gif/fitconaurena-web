/**
 * El mapa de fases.
 *
 * Lo que más puede romperse aquí es la marca de «va por la 3»: se guarda como
 * una posición, no como el id de una fila, así que hay que comprobar que
 * aguanta cuando la coach borra o añade fases.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarFases, faseEnCurso, progresoDeFases, textoFase,
  MAX_FASES, MAX_TITULO, type Fase,
} from "../lib/estrategia";

const mapa = (n: number): Fase[] =>
  Array.from({ length: n }, (_, i) => ({ posicion: i + 1, titulo: `Fase ${i + 1}`, detalle: null }));

test("una fase sin título no se guarda ni cuenta", () => {
  const f = normalizarFases([{ titulo: "Adaptación" }, { titulo: "   " }, { titulo: "Déficit" }]);
  assert.equal(f.length, 2);
  assert.deepEqual(f.map((x) => x.posicion), [1, 2]);
  assert.equal(f[1].titulo, "Déficit");
});

test("se recorta lo larguísimo y se limpia el detalle vacío", () => {
  const f = normalizarFases([{ titulo: "x".repeat(200), detalle: "   " }]);
  assert.equal(f[0].titulo.length, MAX_TITULO);
  assert.equal(f[0].detalle, null);
});

test("no se guardan más fases de las que caben", () => {
  const f = normalizarFases(Array.from({ length: MAX_FASES + 5 }, (_, i) => ({ titulo: `F${i}` })));
  assert.equal(f.length, MAX_FASES);
});

test("lo que no es una lista no rompe nada", () => {
  assert.deepEqual(normalizarFases(null), []);
  assert.deepEqual(normalizarFases("fases"), []);
  assert.deepEqual(normalizarFases([null, 3, "x"]), []);
});

test("si la coach borra fases, la clienta no se queda en una que ya no existe", () => {
  // Iba por la 6 y el mapa se ha quedado en 4.
  assert.equal(faseEnCurso(mapa(4), 6), 4);
});

test("sin fases o sin marca, no hay fase en curso", () => {
  assert.equal(faseEnCurso([], 2), null);
  assert.equal(faseEnCurso(mapa(5), null), null);
  assert.equal(faseEnCurso(mapa(5), 0), null);
  assert.equal(faseEnCurso(mapa(5), "tres"), null);
});

test("mientras no esté marcada la fase, la clienta no ve el mapa", () => {
  assert.equal(progresoDeFases(mapa(6), null), null);
  assert.equal(progresoDeFases([], 1), null);
});

test("el progreso dice dónde está, qué viene y cuánto lleva", () => {
  const p = progresoDeFases(mapa(6), 3)!;
  assert.equal(p.actual, 3);
  assert.equal(p.total, 6);
  assert.equal(p.titulo, "Fase 3");
  assert.equal(p.siguiente, "Fase 4");
  assert.equal(p.pct, 40); // 2 de 5 tramos recorridos
  assert.equal(textoFase(p), "Fase 3 de 6");
});

test("en la última fase no hay siguiente y el recorrido está al 100", () => {
  const p = progresoDeFases(mapa(4), 4)!;
  assert.equal(p.siguiente, null);
  assert.equal(p.pct, 100);
});

test("con una sola fase, estar en ella no es haber terminado", () => {
  const p = progresoDeFases(mapa(1), 1)!;
  assert.equal(p.pct, 50);
  assert.equal(p.siguiente, null);
});

test("las fases desordenadas se ordenan por posición", () => {
  const desordenadas: Fase[] = [
    { posicion: 3, titulo: "Tercera" },
    { posicion: 1, titulo: "Primera" },
    { posicion: 2, titulo: "Segunda" },
  ];
  const p = progresoDeFases(desordenadas, 2)!;
  assert.equal(p.titulo, "Segunda");
  assert.equal(p.siguiente, "Tercera");
});
