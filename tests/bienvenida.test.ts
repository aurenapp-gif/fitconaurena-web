/**
 * El correo de bienvenida que llega cuando ya no le queda nada por hacer.
 *
 * Se prueba el texto, que es lo que lee ella, y el detalle que más se nota si
 * se hace mal: prometerle un plan que su coach todavía no ha subido.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { bienvenidaFirmada } from "../lib/mailer";
import { isAction } from "../lib/activity";

test("la saluda por su nombre de pila, no por el completo", () => {
  const r = bienvenidaFirmada({ nombre: "Marta Ruiz Gómez", tienePlan: true, coach: "Damián" });
  assert.match(r.subject, /Ya estás dentro, Marta/);
  assert.ok(!r.subject.includes("Ruiz"), "por el apellido no la llama nadie");
});

test("sin nombre no queda un hueco raro", () => {
  const r = bienvenidaFirmada({ nombre: null, tienePlan: true, coach: "Damián" });
  assert.match(r.subject, /^Ya estás dentro/);
  assert.ok(!r.html.includes("undefined") && !r.html.includes("null"));
});

test("no le promete un plan que aún no existe", () => {
  const con = bienvenidaFirmada({ nombre: "Marta", tienePlan: true, coach: "Damián" });
  assert.match(con.text, /ya te está esperando/);

  const sin = bienvenidaFirmada({ nombre: "Marta", tienePlan: false, coach: "Damián" });
  assert.match(sin.text, /está preparando tu plan/);
  assert.ok(!sin.text.includes("ya te está esperando"), "no se le dice que está si no está");
});

test("va firmado por su coach, con su nombre", () => {
  const r = bienvenidaFirmada({ nombre: "Marta", tienePlan: true, coach: "Damián" });
  assert.match(r.html, /— Damián/);
  assert.match(r.text, /Nos vemos dentro\. — Damián/);
});

test("un nombre con HTML no rompe el correo", () => {
  const r = bienvenidaFirmada({ nombre: "<script>alert(1)</script>", tienePlan: true, coach: "Damián" });
  assert.ok(!r.html.includes("<script>"), "va escapado");
});

test("la marca de «ya se le dio la bienvenida» no la puede poner el navegador", () => {
  assert.equal(isAction("bienvenida"), false, "si no, se podría dejar a una clienta sin su correo");
  assert.equal(isAction("acceso"), true);
  assert.equal(isAction("plan_abierto"), true);
});
