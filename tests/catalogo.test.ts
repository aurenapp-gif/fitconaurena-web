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
import { coincide, loQueFalta, necesitaAjuste } from "../lib/ejercicios";
import { grupoDe } from "../lib/musculos";
import { idDeYoutube } from "../lib/ejercicios-media";

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

test("el buscador entiende «glúteo» y «polea», no solo los nombres", () => {
  const porGrupo = CATALOGO.filter((e) => coincide(e, "gluteo"));
  const deGluteo = CATALOGO.filter((e) => e.grupo === "gluteo");
  assert.ok(
    porGrupo.length >= deGluteo.length,
    `buscar «glúteo» devuelve ${porGrupo.length} y hay ${deGluteo.length} de glúteo`
  );
  assert.ok(CATALOGO.filter((e) => coincide(e, "polea")).length >= 4);
  // Y sigue encontrando por nombre y por alias: los tres hip thrust más el
  // unilateral, que lo lleva de alias.
  assert.equal(CATALOGO.filter((e) => coincide(e, "hip thrust")).length, 4);
});

/* ---- Los vídeos ---------------------------------------------------------- */

test("solo entra un vídeo de YouTube, y solo su identificador", () => {
  // Lo que se guarda es lo que se va a incrustar: si entrara una URL
  // cualquiera, acabaría dentro de un iframe en la pantalla de una clienta.
  assert.equal(idDeYoutube("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDeYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDeYoutube("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDeYoutube("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDeYoutube("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDeYoutube("  https://youtu.be/dQw4w9WgXcQ  "), "dQw4w9WgXcQ");

  // Y nada más: ni otro sitio, ni javascript:, ni un enlace a medias.
  assert.equal(idDeYoutube("https://vimeo.com/12345678"), null);
  assert.equal(idDeYoutube("javascript:alert(1)"), null);
  assert.equal(idDeYoutube("https://youtube.com.malo.es/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(idDeYoutube("https://www.youtube.com/watch?v=corto"), null);
  assert.equal(idDeYoutube(""), null);
});
