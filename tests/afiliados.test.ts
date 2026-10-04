/**
 * El apartado de recomendación: quién lo ve y quién no.
 *
 * Lo que hay que proteger es el silencio. Mientras el interruptor no esté en
 * «si», ninguna clienta puede leer que hay 200 € por recomendar: eso es una
 * promesa de dinero que, una vez leída, ya no se puede retirar sin quedar mal.
 */
process.env.ADMIN_EMAILS = "aurenapp@gmail.com";

import { test } from "node:test";
import assert from "node:assert/strict";
import { esPerfilDePrueba, puedeVerAfiliados } from "../lib/afiliados";

const JEFES = ["aurenapp@gmail.com"];
const CLIENTA = "laura@gmail.com";

test("apagado: ninguna clienta lo ve", () => {
  assert.equal(puedeVerAfiliados("no", CLIENTA), false);
  assert.equal(puedeVerAfiliados("prueba", CLIENTA), false);
  assert.equal(puedeVerAfiliados("no", null), false);
});

test("en prueba lo ven la coach y sus perfiles de prueba, y nadie más", () => {
  assert.equal(puedeVerAfiliados("prueba", "aurenapp@gmail.com"), true);
  assert.equal(puedeVerAfiliados("prueba", "aurenapp+reco@gmail.com"), true);
  assert.equal(puedeVerAfiliados("prueba", "otra+reco@gmail.com"), false);
});

test("encendido lo ven todas", () => {
  assert.equal(puedeVerAfiliados("si", CLIENTA), true);
});

test("la coach lo ve siempre, para poder mirarlo antes de encenderlo", () => {
  assert.equal(puedeVerAfiliados("no", "aurenapp@gmail.com"), true);
});

test("el alias tiene que ser del correo de la coach, no de cualquiera", () => {
  assert.equal(esPerfilDePrueba("aurenapp+loquesea@gmail.com", JEFES), true);
  assert.equal(esPerfilDePrueba("AurenApp+Loquesea@Gmail.com", JEFES), true);
  // Sin «+» no es un alias: es otra persona con un correo parecido.
  assert.equal(esPerfilDePrueba("aurenapp@gmail.com", JEFES), false);
  assert.equal(esPerfilDePrueba("aurenappp+x@gmail.com", JEFES), false);
  assert.equal(esPerfilDePrueba("aurenapp+x@otrodominio.com", JEFES), false);
  assert.equal(esPerfilDePrueba(null, JEFES), false);
});
