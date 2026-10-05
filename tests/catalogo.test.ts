/**
 * El catálogo de ejercicios.
 *
 * Estas pruebas existen por una razón concreta: una ficha a medias es
 * exactamente el PDF cutre del que venimos. Si un ejercicio llega a la app sin
 * saber cómo se hace, sin sustituto o apuntando a uno que no existe, la
 * clienta se queda delante de una máquina sin respuesta, que es justo lo que
 * esto viene a arreglar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGO, ejercicioPorId, fichaDeNombre } from "../lib/catalogo";
import { loQueFalta, necesitaAjuste } from "../lib/ejercicios";
import { grupoDe } from "../lib/musculos";

test("hay catálogo y todos los identificadores son únicos", () => {
  assert.ok(CATALOGO.length >= 40, `solo hay ${CATALOGO.length} ejercicios`);
  const ids = CATALOGO.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "hay identificadores repetidos");
  for (const id of ids) {
    assert.match(id, /^[a-z0-9-]+$/, `«${id}» no vale como identificador`);
  }
});

test("ningún sustituto apunta a un ejercicio que no existe", () => {
  const rotos: string[] = [];
  for (const e of CATALOGO) {
    for (const s of e.sustitutos) {
      if (!ejercicioPorId(s.id)) rotos.push(`${e.id} → ${s.id}`);
      if (s.id === e.id) rotos.push(`${e.id} se sustituye a sí mismo`);
    }
  }
  assert.deepEqual(rotos, []);
});

test("ninguna ficha está a medias", () => {
  const incompletas = CATALOGO
    // La imagen y el vídeo llegan después: se piden aparte, no aquí.
    .map((e) => ({ id: e.id, falta: loQueFalta(e).filter((f) => f !== "imagen o vídeo") }))
    .filter((x) => x.falta.length > 0);
  assert.deepEqual(incompletas, []);
});

test("todo lo que tiene máquina explica cómo ajustarla", () => {
  const sinAjuste = CATALOGO.filter((e) => necesitaAjuste(e) && e.ajuste.length === 0).map((e) => e.id);
  assert.deepEqual(sinAjuste, []);
});

test("el grupo de la ficha no contradice al clasificador de los planes antiguos", () => {
  // `lib/musculos` reparte por palabras los planes escritos a mano. Si para un
  // ejercicio del catálogo dice otro grupo, uno de los dos está mal y el
  // analizador contaría series en el sitio equivocado.
  const choques: string[] = [];
  for (const e of CATALOGO) {
    const porPalabras = grupoDe(e.nombre);
    if (porPalabras && porPalabras !== e.grupo && !e.secundarios.includes(porPalabras)) {
      choques.push(`${e.nombre}: ficha dice ${e.grupo}, el clasificador dice ${porPalabras}`);
    }
  }
  assert.deepEqual(choques, []);
});

test("un nombre escrito a mano encuentra su ficha", () => {
  assert.equal(fichaDeNombre("hip thrust")?.id, "hip-thrust-maquina");
  assert.equal(fichaDeNombre("Peso muerto rumano")?.id, "peso-muerto-rumano");
  assert.equal(fichaDeNombre("prensa")?.id, "prensa-45");
  // Lo que no está, no se inventa.
  assert.equal(fichaDeNombre("ejercicio que no existe"), null);
});

test("los sustitutos de cada ejercicio son distintos entre sí", () => {
  const repes: string[] = [];
  for (const e of CATALOGO) {
    const vistos = new Set<string>();
    for (const s of e.sustitutos) {
      if (vistos.has(s.id)) repes.push(`${e.id} repite ${s.id}`);
      vistos.add(s.id);
    }
  }
  assert.deepEqual(repes, []);
});
