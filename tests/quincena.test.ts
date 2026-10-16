/**
 * Las casillas de la quincena.
 *
 * Son datos que ella estima a ojo, así que lo importante no es la precisión:
 * es que del navegador no entre cualquier número y que, si las columnas aún
 * no existen, la revisión se guarde igual con sus fotos y su peso.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAMPOS_QUINCENA, resumenQuincena, textoDe, valorValido } from "../lib/quincena";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");

test("están las cinco preguntas que se pidieron", () => {
  assert.deepEqual(
    CAMPOS_QUINCENA.map((c) => c.id),
    ["pasos_media", "agua_media", "dias_entreno", "cumplimiento", "comidas_fuera"]
  );
});

test("solo entra un valor que sea una opción de verdad", () => {
  assert.equal(valorValido("pasos_media", "8000"), 8000);
  assert.equal(valorValido("pasos_media", "7500"), null, "7.500 no es una casilla");
  assert.equal(valorValido("cumplimiento", "100"), 100);
  assert.equal(valorValido("cumplimiento", "110"), null);
  assert.equal(valorValido("agua_media", "15"), 15, "1,5 L se guarda como 15 décimas");
  assert.equal(valorValido("agua_media", "1.5"), null, "los decimales no entran");
  assert.equal(valorValido("inventado", "1"), null);
  assert.equal(valorValido("dias_entreno", ""), null);
});

test("ninguna comida fuera es una respuesta, no un hueco", () => {
  // Si no existiera el cero, quien no come fuera tendría que dejarlo vacío y
  // se confundiría con «no ha contestado».
  assert.equal(valorValido("comidas_fuera", "0"), 0);
  assert.equal(textoDe("comidas_fuera", 0), "sin comidas fuera");
});

test("cada respuesta se lee en castellano", () => {
  assert.equal(textoDe("pasos_media", 8000), "8.000 pasos");
  assert.equal(textoDe("agua_media", 25), "2,5 L");
  assert.equal(textoDe("dias_entreno", 5), "Más de 4 días/sem");
  assert.equal(textoDe("cumplimiento", 80), "plan 80 %");
  assert.equal(textoDe("pasos_media", null), null);
  assert.equal(textoDe("pasos_media", 1234), null, "un valor que no es opción no se pinta");
});

test("el resumen junta solo lo contestado", () => {
  assert.equal(
    resumenQuincena({ pasos_media: 8000, cumplimiento: 80, comidas_fuera: 2 }),
    "8.000 pasos · plan 80 % · 2 fuera/sem"
  );
  assert.equal(resumenQuincena({}), "");
});

test("si las columnas aún no existen, la revisión se guarda igual", () => {
  const api = leer("app/api/miembros/checkin/route.ts");
  assert.match(api, /const opcionales = \{ \.\.\.conEjercicios, \.\.\.conEstrellas, \.\.\.quincena \}/);
  assert.match(api, /let dropped = Object\.keys\(opcionales\)\.length > 0;/);
});

test("con solo las casillas marcadas ya se puede enviar", () => {
  assert.match(leer("components/CheckinForm.tsx"), /&& !algoDeLaQuincena\) \{/);
});
