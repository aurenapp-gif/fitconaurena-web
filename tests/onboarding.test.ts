/**
 * Los enlaces de los vídeos del onboarding.
 *
 * Aquí se pega un enlace a mano, así que lo importante es que se entiendan
 * todas las formas en que se copia uno —de Vimeo y de YouTube— y que un vídeo
 * privado de Vimeo se abra: esos llevan una llave detrás del número y sin
 * pasársela al reproductor sale un cuadro negro.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { fuenteDeVideo, urlDeReproductor, ONBOARDING, onboardingDisponible } from "../lib/onboarding";

test("un enlace normal de Vimeo", () => {
  assert.deepEqual(fuenteDeVideo("https://vimeo.com/123456789"), { plataforma: "vimeo", id: "123456789", hash: null });
  assert.deepEqual(fuenteDeVideo("vimeo.com/123456789"), { plataforma: "vimeo", id: "123456789", hash: null });
  assert.deepEqual(fuenteDeVideo("123456789"), { plataforma: "vimeo", id: "123456789", hash: null });
});

test("un vídeo privado de Vimeo conserva su llave", () => {
  const f = fuenteDeVideo("https://vimeo.com/123456789/a1b2c3d4e5");
  assert.deepEqual(f, { plataforma: "vimeo", id: "123456789", hash: "a1b2c3d4e5" });
  assert.match(urlDeReproductor(f!), /h=a1b2c3d4e5/, "sin la llave, el vídeo privado no abre");
});

test("los enlaces de YouTube, en todas sus formas", () => {
  for (const u of [
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "dQw4w9WgXcQ",
  ]) {
    assert.deepEqual(fuenteDeVideo(u), { plataforma: "youtube", id: "dQw4w9WgXcQ" }, u);
  }
});

test("lo que no es un vídeo no se cuela", () => {
  for (const basura of ["", "   ", "https://fitconaurena.com", "hola", "https://vimeo.com/", "12345"]) {
    assert.equal(fuenteDeVideo(basura), null, JSON.stringify(basura));
  }
});

test("el reproductor de Vimeo va sin adornos y sin rastrear", () => {
  const url = urlDeReproductor(fuenteDeVideo("https://vimeo.com/987654321")!);
  assert.match(url, /^https:\/\/player\.vimeo\.com\/video\/987654321\?/);
  for (const trozo of ["title=0", "byline=0", "portrait=0", "dnt=1", "playsinline=1"]) {
    assert.ok(url.includes(trozo), `falta ${trozo}`);
  }
});

test("un vídeo sin enlace todavía no se enseña", () => {
  assert.equal(ONBOARDING.length, 3, "primeros pasos, estrategia y KPIs");
  const sinEnlace = ONBOARDING.filter((v) => !v.url);
  assert.equal(
    onboardingDisponible().length, ONBOARDING.length - sinEnlace.length,
    "se enseñan solo los que ya tienen vídeo: así se pueden subir de uno en uno"
  );
  for (const v of ONBOARDING) {
    assert.ok(v.id && v.titulo && v.descripcion, "cada uno con su título y su línea");
  }
});
