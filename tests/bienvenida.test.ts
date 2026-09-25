/**
 * El correo de bienvenida al programa.
 *
 * Es lo primero que lee cuando ya está dentro, así que se prueba lo que más se
 * nota si se rompe: que la llame por su nombre, que vaya firmado por su coach,
 * y que no se le cuele ni una palabra de papeleo. Ese momento es para
 * celebrar que ha empezado, no para recordarle lo que acaba de firmar.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { bienvenidaFirmada } from "../lib/mailer";
import { isAction } from "../lib/activity";

const correo = (nombre: string | null = "Marta Ruiz Gómez") =>
  bienvenidaFirmada({ nombre, coach: "Damián" });

test("la saluda por su nombre de pila, no por el completo", () => {
  const r = correo();
  assert.match(r.subject, /Bienvenida al Programa FITCON, Marta/);
  assert.ok(!r.subject.includes("Gómez"), "por el apellido no la llama nadie");
  assert.match(r.html, /Bienvenida, Marta/);
});

test("sin nombre no queda un hueco raro", () => {
  const r = correo(null);
  assert.match(r.subject, /^Bienvenida al Programa FITCON/);
  assert.ok(!r.html.includes("undefined") && !r.html.includes("null"));
  assert.ok(!r.html.includes(", ."), "ni una coma suelta donde iría el nombre");
  assert.ok(!r.text.includes(", ."));
});

test("va firmado por su coach y cierra con el principio", () => {
  const r = correo();
  assert.match(r.html, /Esto es solo el principio, Marta/);
  assert.match(r.text, /Vamos a por ello\. — Damián/);
});

test("no le habla de contratos ni de papeleo", () => {
  const r = correo();
  for (const palabra of [/contrato/i, /firmad/i, /papeleo/i, /anexo/i, /trámite/i]) {
    assert.ok(!palabra.test(r.html), `el correo no debe decir ${palabra}`);
    assert.ok(!palabra.test(r.text), `el texto plano tampoco: ${palabra}`);
  }
});

test("un nombre con HTML no rompe el correo", () => {
  const r = bienvenidaFirmada({ nombre: "<script>alert(1)</script>", coach: "Damián" });
  assert.ok(!r.html.includes("<script>"), "va escapado");
});

test("la marca de «ya se le dio la bienvenida» no la puede poner el navegador", () => {
  assert.equal(isAction("bienvenida"), false, "si no, se podría dejar a una clienta sin su correo");
  assert.equal(isAction("acceso"), true);
  assert.equal(isAction("plan_abierto"), true);
});
