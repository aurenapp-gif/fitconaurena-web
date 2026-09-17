/**
 * Las reglas que protegen a una clienta de comerse el plan de otra, o el suyo
 * mal leído.
 *
 * Esto no se prueba por gusto de probar: `normaliza` es lo único que hay entre
 * lo que devuelve un modelo leyendo un PDF borroso y lo que una persona se va
 * a comer o a levantar. Un «120» donde ponía «220» no da error en ningún sitio;
 * solo se nota en el cuerpo de alguien.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliza, textoDeEstructura } from "../lib/plan-estructura";
import { renovacionEntrenamiento, semanasValidas } from "../lib/renovaciones";

test("ante la duda, no se guarda nada", () => {
  assert.equal(
    normaliza("nutricion", { legible: false, dias: [{ nombre: "Lunes", comidas: [] }], notas: [] }),
    null,
    "un plan que el modelo marca ilegible se descarta entero"
  );
  assert.equal(
    normaliza("nutricion", { legible: true, dias: [], notas: ["algo"] }),
    null,
    "un plan sin días no es un plan: enseñar una pantalla vacía asusta más que el PDF"
  );
  assert.equal(
    normaliza("entrenamiento", { legible: true, dias: [{ nombre: "Día A", foco: null, ejercicios: [] }], notas: [] }),
    null,
    "un día sin ejercicios tampoco"
  );
  assert.equal(normaliza("nutricion", null), null, "basura entra, null sale");
  assert.equal(normaliza("entrenamiento", "un plan, palabra"), null, "y si no es ni un objeto, igual");
});

test("las cantidades se guardan tal y como las escribió la coach", () => {
  const p = normaliza("nutricion", {
    legible: true,
    notas: ["Bebe 2,5 L al día"],
    dias: [{
      nombre: "Todos los días",
      comidas: [{
        nombre: "Desayuno", momento: "8:00",
        opciones: [
          { etiqueta: null, items: [
            { alimento: "Huevos", cantidad: "2-3" },
            { alimento: "Ensalada", cantidad: "libre" },
            { alimento: "Avena", cantidad: "60 g" },
            { alimento: "Café", cantidad: null },
          ] },
          { etiqueta: "Si entrenas temprano", items: [{ alimento: "Plátano", cantidad: "1 pieza" }] },
        ],
      }],
    }],
  });
  assert.ok(p && p.tipo === "nutricion");
  const items = p.dias[0].comidas[0].opciones[0].items;
  assert.equal(items[0].cantidad, "2-3", "un rango sigue siendo un rango: elegir por ella sería cambiarle el plan");
  assert.equal(items[1].cantidad, "libre");
  assert.equal(items[2].cantidad, "60 g", "los gramos viajan con su unidad");
  assert.equal(items[3].cantidad, null, "sin cantidad escrita, no se inventa una");
  assert.equal(p.dias[0].comidas[0].opciones.length, 2, "se conservan las alternativas que dio la coach");
});

test("el entrenamiento no se normaliza ni se redondea", () => {
  const p = normaliza("entrenamiento", {
    legible: true, notas: [],
    dias: [{
      nombre: "Día A", foco: "Pierna",
      ejercicios: [
        { nombre: "Sentadilla", series: 4, repeticiones: "8", descanso: "90 s", nota: "Rodillas fuera" },
        { nombre: "Zancadas", series: 3, repeticiones: "12 por pierna", descanso: null, nota: null },
        { nombre: "Hip thrust", series: "cuatro", repeticiones: "10", descanso: null, nota: null },
        { nombre: "Prensa", series: 0, repeticiones: "12", descanso: null, nota: null },
        { nombre: "   ", series: 3, repeticiones: "10", descanso: null, nota: null },
      ],
    }],
  });
  assert.ok(p && p.tipo === "entrenamiento");
  const ej = p.dias[0].ejercicios;
  assert.equal(ej.length, 4, "el ejercicio sin nombre se cae y los demás se quedan");
  assert.equal(ej[0].nombre, "Sentadilla", "el nombre va tal cual, sin traducir");
  assert.equal(ej[1].repeticiones, "12 por pierna", "las repeticiones son texto porque no siempre son un número");
  assert.equal(ej[2].series, null, "unas series que no son un número entero se descartan, no se adivinan");
  assert.equal(ej[3].series, null, "cero series no es una serie");
});

test("lo que ve la clienta y lo que sabe FitAI salen del mismo sitio", () => {
  const nut = normaliza("nutricion", {
    legible: true, notas: [],
    dias: [{ nombre: "Todos los días", comidas: [{
      nombre: "Comida", momento: null,
      opciones: [{ etiqueta: null, items: [{ alimento: "Arroz basmati", cantidad: "120 g" }] }],
    }] }],
  });
  assert.ok(nut);
  assert.match(textoDeEstructura(nut), /Arroz basmati — 120 g/);

  const ent = normaliza("entrenamiento", {
    legible: true, notas: [],
    dias: [{ nombre: "Día A", foco: null, ejercicios: [
      { nombre: "Sentadilla", series: 4, repeticiones: "8", descanso: "90 s", nota: null },
    ] }],
  });
  assert.ok(ent);
  assert.match(textoDeEstructura(ent), /Sentadilla — 4×8, descanso 90 s/);
});

test("cada bloque de entrenamiento dura lo suyo", () => {
  assert.equal(semanasValidas(8), 8);
  assert.equal(semanasValidas(10), 10);
  assert.equal(semanasValidas(12), 12);
  assert.equal(semanasValidas(9), 12, "un valor que no ofrecemos cae al de siempre");
  assert.equal(semanasValidas("ocho"), 12);
  assert.equal(semanasValidas(null), 12);

  assert.equal(renovacionEntrenamiento("2026-09-01", "2026-09-17", 8).toca, "2026-10-27");
  assert.equal(renovacionEntrenamiento("2026-09-01", "2026-09-17", 12).toca, "2026-11-24");
  assert.equal(
    renovacionEntrenamiento("2026-09-01", "2026-09-17", null).toca,
    renovacionEntrenamiento("2026-09-01", "2026-09-17", 12).toca,
    "los planes subidos antes de esto no tienen el dato y siguen contando doce: nadie ve cambiar una fecha"
  );
});
