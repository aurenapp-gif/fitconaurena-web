/**
 * La venta que se apunta sola al firmar un contrato.
 *
 * Dos cosas que no pueden fallar, por este orden: no inventar un precio, y no
 * apuntar dos veces el mismo contrato. En dinero, apuntar de más es peor que
 * no apuntar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { precioDeTitulo, origenDeContrato, ventaDeContrato, textoEuros } from "../lib/contabilidad";

test("el precio sale del nombre de la plantilla", () => {
  assert.equal(precioDeTitulo("Contrato Programa 1197"), 119700);
  assert.equal(precioDeTitulo("Contrato Programa 1497"), 149700);
  assert.equal(precioDeTitulo("Contrato Programa 1897"), 189700);
  assert.equal(precioDeTitulo("Contrato Programa 2500"), 250000);
});

test("vale escrito con punto de millar", () => {
  assert.equal(precioDeTitulo("Contrato Programa 2.500"), 250000);
});

test("con varios números manda el precio, no los meses", () => {
  // «12 meses» no es una venta de doce euros.
  assert.equal(precioDeTitulo("Programa 12 meses 1497"), 149700);
});

test("sin precio reconocible NO se inventa uno", () => {
  assert.equal(precioDeTitulo("Contrato"), null);
  assert.equal(precioDeTitulo("Anexo I — Declaración de salud"), null);
  assert.equal(precioDeTitulo(null), null);
  assert.equal(precioDeTitulo(""), null);
});

test("una cifra imposible para un programa no cuenta", () => {
  assert.equal(precioDeTitulo("Contrato 12"), null);        // demasiado barato
  assert.equal(precioDeTitulo("Contrato 999999"), null);    // demasiado caro
});

test("la llave del contrato es la asignación, que es única por clienta", () => {
  assert.equal(origenDeContrato("abc-123"), "contrato:abc-123");
});

test("la venta sale con su fecha, su importe y su llave", () => {
  const v = ventaDeContrato({
    email: "clienta@example.com",
    titulo: "Contrato Programa 2500",
    assignmentId: "abc-123",
    firmadoEl: "2026-09-19T17:04:00Z",
  })!;
  assert.equal(v.member_email, "clienta@example.com");
  assert.equal(v.importe_cent, 250000);
  assert.equal(v.fecha, "2026-09-19");
  assert.equal(v.origen, "contrato:abc-123");
  assert.equal(textoEuros(v.importe_cent), "2500,00 €");
});

test("sin precio no se devuelve venta: no se apunta nada", () => {
  assert.equal(
    ventaDeContrato({ email: "a@b.com", titulo: "Contrato", assignmentId: "x", firmadoEl: "2026-09-19T00:00:00Z" }),
    null
  );
});

test("dos firmas distintas dan llaves distintas; la misma, la misma", () => {
  const una = ventaDeContrato({ email: "a@b.com", titulo: "Contrato Programa 1497", assignmentId: "a1", firmadoEl: "2026-09-01T00:00:00Z" })!;
  const otra = ventaDeContrato({ email: "c@d.com", titulo: "Contrato Programa 1497", assignmentId: "a2", firmadoEl: "2026-09-01T00:00:00Z" })!;
  const repetida = ventaDeContrato({ email: "a@b.com", titulo: "Contrato Programa 1497", assignmentId: "a1", firmadoEl: "2026-09-01T00:00:00Z" })!;
  assert.notEqual(una.origen, otra.origen);
  assert.equal(una.origen, repetida.origen);
});
