/**
 * La parte de alimentación.
 *
 * Dos cosas que no pueden fallar: que el detector NO se invente una pauta
 * cogiendo cualquier número del plan (hay cientos: gramos de pollo, de arroz),
 * y que la cuenta del gasto no se enseñe con plazos cortos, donde manda el
 * agua corporal y no la grasa.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectarMacros, gastoImplicito, macrosValidos, metabolismoBasal, proteinaPorKg,
} from "../lib/nutricion";
import { analizar, type DatosClienta } from "../lib/analisis";

// ---- Metabolismo basal -----------------------------------------------------

test("el basal sale por Mifflin-St Jeor, fórmula de mujer", () => {
  // 10*70 + 6.25*165 - 5*35 - 161 = 1395,25 -> 1395
  assert.equal(metabolismoBasal(70, 165, 35), 1395);
});

test("sin altura o sin edad no hay basal: no se inventa", () => {
  assert.equal(metabolismoBasal(70, null, 35), null);
  assert.equal(metabolismoBasal(70, 165, null), null);
  assert.equal(metabolismoBasal(null, 165, 35), null);
});

// ---- Gasto implícito -------------------------------------------------------

test("el gasto se despeja de lo que ha pasado con el peso", () => {
  // 1.800 kcal, -2 kg en 28 días -> 1800 + 2*7700/28 = 2350
  assert.equal(gastoImplicito(1800, -2, 28), 2350);
});

test("con menos de tres semanas no se da el gasto: manda el agua", () => {
  assert.equal(gastoImplicito(1800, -2, 14), null);
});

test("sin pauta no hay cuenta", () => {
  assert.equal(gastoImplicito(null, -2, 28), null);
  assert.equal(gastoImplicito(1800, null, 28), null);
});

// ---- Proteína --------------------------------------------------------------

test("la proteína se mide por kilo de peso", () => {
  assert.equal(proteinaPorKg(130, 70), 1.9);
  assert.equal(proteinaPorKg(90, 70), 1.3);
  assert.equal(proteinaPorKg(null, 70), null);
});

// ---- Detección en el texto del plan ---------------------------------------

test("encuentra las calorías y la proteína cuando el plan las dice", () => {
  assert.deepEqual(
    detectarMacros("Plan de 2.100 kcal diarias.\nProteína: 130 g\nGrasas: 60 g"),
    { kcal: 2100, proteina: 130 }
  );
  assert.deepEqual(
    detectarMacros("Calorías totales: 1800\n140 gramos de proteína al día"),
    { kcal: 1800, proteina: 140 }
  );
});

test("no coge un número suelto del plan como si fuera la pauta", () => {
  // Hay gramos por todas partes, pero ninguno es la pauta de proteína.
  const t = "Desayuno: 200 g de yogur, 30 g de avena.\nComida: 150 g de pollo y 80 g de arroz.";
  assert.deepEqual(detectarMacros(t), { kcal: null, proteina: null });
});

test("un número imposible no se da por bueno", () => {
  assert.equal(detectarMacros("12 kcal al día").kcal, null);
  assert.equal(detectarMacros("Proteína: 900 g").proteina, null);
});

test("lo que se guarda se valida igual que lo detectado", () => {
  assert.deepEqual(macrosValidos("2100", "130"), { kcal: 2100, proteina: 130 });
  assert.deepEqual(macrosValidos("", ""), { kcal: null, proteina: null });
  // Un cero de más no se guarda como dato: mejor no saberlo.
  assert.deepEqual(macrosValidos("21000", "1300"), { kcal: null, proteina: null });
});

// ---- Las reglas, dentro del analizador ------------------------------------

const HOY = "2026-10-02";
const dias = (n: number) => new Date(Date.parse(`${HOY}T10:00:00Z`) - n * 86400000).toISOString();

const base: DatosClienta = {
  objetivo: "Perder grasa",
  alturaCm: 165,
  edad: 35,
  revisiones: [{ created_at: dias(28), weight: 70 }, { created_at: dias(0), weight: 69.3 }],
  habitos: [],
  series: [],
  pasosObjetivo: null,
  hoy: HOY,
};
const ids = (d: Partial<DatosClienta>) => analizar({ ...base, ...d }).map((x) => x.id);

test("sin la pauta apuntada, se pide el dato en vez de opinar de la comida", () => {
  const h = ids({ nutricion: { kcal: null, proteina: null, tienePlan: true } });
  assert.ok(h.includes("sin-pauta"));
  assert.ok(!h.includes("proteina-baja"));
  assert.ok(!h.includes("come-mas-de-lo-que-cree"));
});

test("sin plan de alimentación tampoco se pide nada", () => {
  assert.ok(!ids({ nutricion: { kcal: null, proteina: null, tienePlan: false } }).includes("sin-pauta"));
});

test("la proteína corta sale con los gramos exactos que faltan", () => {
  const h = analizar({ ...base, nutricion: { kcal: 1800, proteina: 90, tienePlan: true } });
  const p = h.find((x) => x.id === "proteina-baja")!;
  assert.ok(p, "no ha visto la proteína baja");
  assert.equal(p.prioridad, "alta");
  assert.match(p.dato, /1,3 g por kilo/);
});

test("una proteína suficiente no se señala", () => {
  assert.ok(!ids({ nutricion: { kcal: 1800, proteina: 130, tienePlan: true } }).includes("proteina-baja"));
});

test("pautar por debajo del metabolismo basal se marca", () => {
  const h = ids({ nutricion: { kcal: 1100, proteina: 130, tienePlan: true } });
  assert.ok(h.includes("kcal-bajo-basal"));
});

test("si el peso no cuadra con la pauta, se dice que come mas, no que su metabolismo falla", () => {
  // 1.400 kcal pautadas y apenas baja: el gasto despejado queda por debajo del basal.
  const h = analizar({
    ...base,
    revisiones: [{ created_at: dias(28), weight: 70 }, { created_at: dias(0), weight: 69.9 }],
    nutricion: { kcal: 1400, proteina: 130, tienePlan: true },
  });
  const x = h.find((y) => y.id === "come-mas-de-lo-que-cree")!;
  assert.ok(x, "no ha detectado el desajuste");
  assert.match(x.quehacer, /no se está cumpliendo/);
  // Y no manda bajar calorías, que es el error clásico.
  assert.match(x.quehacer, /Antes de bajarle calorías/);
});

test("cuando la pauta cuadra con lo que pasa, se dice que no se toque", () => {
  const h = ids({ nutricion: { kcal: 2000, proteina: 130, tienePlan: true } });
  assert.ok(h.includes("pauta-calibrada"));
  assert.ok(!h.includes("come-mas-de-lo-que-cree"));
});

test("sin altura ni edad no se hacen cuentas de calorías", () => {
  const h = ids({ alturaCm: null, edad: null, nutricion: { kcal: 1100, proteina: 130, tienePlan: true } });
  assert.ok(!h.includes("kcal-bajo-basal"));
  assert.ok(!h.includes("come-mas-de-lo-que-cree"));
});
