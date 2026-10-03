/**
 * Las cuentas del negocio.
 *
 * Dos cosas se prueban aquí, y las dos son de las que no avisan cuando fallan:
 * que un importe escrito a mano entre por el valor que la persona quería decir
 * —2.500 no son dos euros y medio—, y que facturado y cobrado no se mezclen,
 * que es el error que hace creerse rico a quien no ha cobrado todavía.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  importeACent, textoEuros, fechaValida, mesDe, resumen, porClienta,
  type Venta, type Cobro,
} from "../lib/contabilidad";

const venta = (email: string, euros: number, fecha: string): Venta => ({
  id: `v-${email}-${fecha}-${euros}`, member_email: email, concepto: null,
  importe_cent: euros * 100, fecha, metodo: null, nota: null,
});
const cobro = (email: string, euros: number, fecha: string): Cobro => ({
  id: `c-${email}-${fecha}-${euros}`, member_email: email, venta_id: null,
  importe_cent: euros * 100, fecha, metodo: null, nota: null,
});

test("un importe se entiende como lo escribe una persona", () => {
  assert.equal(importeACent("2500"), 250000);
  assert.equal(importeACent("2.500"), 250000, "el punto de los miles no son decimales");
  assert.equal(importeACent("2.500,50"), 250050);
  assert.equal(importeACent("2500,50"), 250050);
  assert.equal(importeACent("2500.50"), 250050, "dos cifras detrás del punto sí son decimales");
  assert.equal(importeACent("2,5"), 250, "2,5 € son dos euros y medio");
  assert.equal(importeACent("2.500 €"), 250000, "con el símbolo pegado también");
  assert.equal(importeACent("300"), 30000);
  assert.equal(importeACent(2500), 250000);
});

test("lo que no es un importe no entra", () => {
  for (const basura of ["", "   ", "abc", "-100", "2..5", "1,2,3,4", "300,", ",50", null, undefined, {}]) {
    assert.equal(importeACent(basura), null, JSON.stringify(basura));
  }
  assert.equal(importeACent("99999999"), null, "cien millones de euros es un dedazo");
});

test("cómo se lee en pantalla", () => {
  // Con cuatro cifras el español no pone punto de millar: «2500,50», no
  // «2.500,50». A partir de cinco, sí.
  assert.equal(textoEuros(250050), "2500,50 €");
  assert.equal(textoEuros(1234567), "12.345,67 €");
  assert.equal(textoEuros(0), "0,00 €");
});

test("facturado y cobrado no son lo mismo", () => {
  // Firma 2.500 en septiembre y paga 300 de entrada.
  const ventas = [venta("ana@x.com", 2500, "2026-09-10")];
  const cobros = [cobro("ana@x.com", 300, "2026-09-10")];

  const r = resumen(ventas, cobros, [], "2026-09");
  assert.equal(r.facturado, 250000, "se ha vendido el programa entero");
  assert.equal(r.cobrado, 30000, "pero en el banco solo hay 300");
  assert.equal(r.pendiente, 220000, "y faltan 2.200 por entrar");
});

test("lo pendiente se mira sobre el total, no sobre el mes", () => {
  const ventas = [venta("ana@x.com", 2500, "2026-01-15")];
  const cobros = [cobro("ana@x.com", 2500, "2026-03-01")];

  const marzo = resumen(ventas, cobros, [], "2026-03");
  assert.equal(marzo.facturado, 0, "en marzo no se vendió nada");
  assert.equal(marzo.cobrado, 250000, "pero entraron los 2.500 de enero");
  assert.equal(marzo.pendiente, 0, "y ya no queda nada por cobrar");
});

test("cobrar de más no deja un pendiente negativo", () => {
  const r = resumen([venta("ana@x.com", 100, "2026-09-01")], [cobro("ana@x.com", 150, "2026-09-02")]);
  assert.equal(r.pendiente, 0, "«te deben -50 €» no significa nada");
});

test("sin mes, el histórico entero", () => {
  const ventas = [venta("ana@x.com", 1000, "2026-01-01"), venta("eva@x.com", 2000, "2026-09-01")];
  const r = resumen(ventas, []);
  assert.equal(r.facturado, 300000);
});

test("arriba, la que más debe", () => {
  const ventas = [
    venta("ana@x.com", 2500, "2026-09-01"),
    venta("eva@x.com", 1200, "2026-09-02"),
    venta("sara@x.com", 800, "2026-09-03"),
  ];
  const cobros = [
    cobro("ana@x.com", 2500, "2026-09-01"),   // al corriente
    cobro("eva@x.com", 200, "2026-09-02"),    // debe 1.000
    cobro("sara@x.com", 100, "2026-09-10"),   // debe 700
  ];
  const filas = porClienta(ventas, cobros, (e) => e.split("@")[0]);

  assert.deepEqual(filas.map((f) => f.nombre), ["eva", "sara", "ana"], "primero a quien hay que perseguir");
  assert.equal(filas[0].pendiente, 100000);
  assert.equal(filas[2].pendiente, 0, "ana está al día");
  assert.equal(filas[1].ultimoCobro, "2026-09-10", "y cuándo pagó por última vez");
});

test("las fechas", () => {
  assert.equal(fechaValida("2026-09-28"), "2026-09-28");
  assert.equal(fechaValida("2026-02-31"), null, "el 31 de febrero no existe");
  assert.equal(fechaValida("28/09/2026"), null);
  assert.equal(fechaValida(""), null);
  assert.equal(mesDe("2026-09-28"), "2026-09");
});

/* ---- Gastos y margen ---------------------------------------------------- */

import { CATEGORIAS_GASTO, porMes, type Gasto } from "../lib/contabilidad";

const gasto = (cent: number, fecha: string, categoria = CATEGORIAS_GASTO[0]): Gasto =>
  ({ id: fecha + cent, concepto: null, importe_cent: cent, fecha, categoria, member_email: null, nota: null });

test("el margen es lo cobrado menos lo gastado, no lo facturado", () => {
  // Vendidos 2.500, cobrados 300, y 200 de comisión: el margen son 100.
  const r = resumen(
    [venta("ana@x.com", 2500, "2026-10-01")],
    [cobro("ana@x.com", 300, "2026-10-01")],
    [gasto(20000, "2026-10-02")],
    "2026-10"
  );
  assert.equal(r.facturado, 250000);
  assert.equal(r.cobrado, 30000);
  assert.equal(r.gastos, 20000);
  assert.equal(r.margen, 10000, "el margen sale de lo que ha entrado, no de lo prometido");
});

test("un mes puede salir en negativo, y hay que poder verlo", () => {
  const r = resumen([], [], [gasto(40000, "2026-10-02")], "2026-10");
  assert.equal(r.margen, -40000);
});

test("sin gastos, el margen es lo cobrado", () => {
  const r = resumen([venta("ana@x.com", 2500, "2026-10-01")], [cobro("ana@x.com", 2500, "2026-10-01")], [], "2026-10");
  assert.equal(r.margen, 250000);
});

test("cada gasto cuenta en su mes, y el margen del mes con él", () => {
  const m = porMes(
    [venta("ana@x.com", 2500, "2026-09-19")],
    [cobro("ana@x.com", 2500, "2026-09-20")],
    [gasto(20000, "2026-10-05")]
  );
  const sept = m.find((x) => x.mes === "2026-09")!;
  const oct = m.find((x) => x.mes === "2026-10")!;
  assert.equal(sept.gastos, 0);
  assert.equal(sept.margen, 250000);
  assert.equal(oct.gastos, 20000);
  assert.equal(oct.margen, -20000, "un mes solo de gastos resta");
  assert.equal(oct.contratos, 0);
});
