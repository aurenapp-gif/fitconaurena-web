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
  assert.equal(puedeVerAfiliados(false, CLIENTA), false);
  assert.equal(puedeVerAfiliados(false, null), false);
  // Ni aunque se ponga un «+» en su propio correo: el alias tiene que ser del
  // correo de la coach.
  assert.equal(puedeVerAfiliados(false, "laura+reco@gmail.com"), false);
});

test("apagado lo ven la coach y sus perfiles de prueba, para poder mirarlo", () => {
  assert.equal(puedeVerAfiliados(false, "aurenapp@gmail.com"), true);
  assert.equal(puedeVerAfiliados(false, "aurenapp+reco@gmail.com"), true);
});

test("encendido lo ven todas", () => {
  assert.equal(puedeVerAfiliados(true, CLIENTA), true);
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
