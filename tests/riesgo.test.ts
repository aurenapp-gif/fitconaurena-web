/**
 * Las señales de que una clienta se está yendo.
 *
 * Lo que hay que proteger aquí es que NO salte por nada: un panel que marca a
 * todo el mundo en rojo se deja de mirar a la semana. Y que sí salte en los
 * casos reales de octubre, que son los que motivaron esto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { diasEntre, enRiesgo, riesgoDe } from "../lib/riesgo";

const base = { planes: 3, revisiones: 3, diasSinApuntar: 1, diasSinRevision: 5, diasDeAlta: 60 };

test("una clienta que va bien no sale en la lista", () => {
  const r = riesgoDe(base);
  assert.equal(r.nivel, "ok");
  assert.deepEqual(r.motivos, []);
});

test("una recién llegada no se marca por no haber apuntado todavía", () => {
  // ainhoa, dada de alta ayer: no tiene nada apuntado y es normal.
  const r = riesgoDe({ planes: 1, revisiones: 0, diasSinApuntar: null, diasSinRevision: null, diasDeAlta: 1 });
  assert.equal(r.nivel, "ok");
});

test("pagar y no tener plan es lo más grave", () => {
  // El caso de ainhoa e IRINA en octubre: han pagado y están esperando.
  const r = riesgoDe({ planes: 0, revisiones: 0, diasSinApuntar: null, diasSinRevision: null, diasDeAlta: 5 });
  assert.equal(r.nivel, "alto");
  assert.match(r.motivos[0], /5 días dada de alta y sin plan/);
});

test("pero el primer día sin plan todavía no es un problema", () => {
  const r = riesgoDe({ planes: 0, revisiones: 0, diasSinApuntar: null, diasSinRevision: null, diasDeAlta: 1 });
  assert.equal(r.nivel, "ok");
});

test("nunca ha subido una revisión, pasada la primera quincena", () => {
  // Joana: 12 planes, 0 revisiones, meses dentro.
  const r = riesgoDe({ planes: 12, revisiones: 0, diasSinApuntar: 20, diasSinRevision: null, diasDeAlta: 45 });
  assert.equal(r.nivel, "alto");
  assert.ok(r.motivos.includes("no ha subido ninguna revisión"));
  assert.ok(r.motivos.some((m) => /sin apuntar/.test(m)));
});

test("dejar de apuntar avisa antes que dejar de subir revisiones", () => {
  const seisDias = riesgoDe({ ...base, diasSinApuntar: 6 });
  const diezDias = riesgoDe({ ...base, diasSinApuntar: 10 });
  assert.equal(seisDias.nivel, "medio");
  assert.equal(diezDias.nivel, "medio");
  assert.ok(diezDias.puntos > seisDias.puntos, "diez días pesan más que seis");
});

test("un mes sin revisión es nivel alto", () => {
  const r = riesgoDe({ ...base, diasSinRevision: 31 });
  assert.equal(r.nivel, "alto");
});

test("las peores salen primero y las que van bien no salen", () => {
  const filas = [
    { email: "ok@x.com", riesgo: riesgoDe(base) },
    { email: "media@x.com", riesgo: riesgoDe({ ...base, diasSinApuntar: 7 }) },
    { email: "grave@x.com", riesgo: riesgoDe({ ...base, planes: 0, diasDeAlta: 9 }) },
  ];
  const fuera = enRiesgo(filas);
  assert.deepEqual(fuera.map((f) => f.email), ["grave@x.com", "media@x.com"]);
});

test("los días se cuentan enteros y nunca en negativo", () => {
  assert.equal(diasEntre("2026-10-01", "2026-10-10"), 9);
  assert.equal(diasEntre("2026-10-10", "2026-10-01"), 0);
});
