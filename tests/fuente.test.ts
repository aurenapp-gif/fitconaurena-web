/**
 * La tipografía va en el repositorio, no se baja al compilar.
 *
 * `next/font/google` la descargaba EN CADA COMPILACIÓN. El 6 y el 12 de
 * noviembre Google no respondió y el build se cayó entero, bloqueando el
 * despliegue por algo ajeno al programa. Un fallo así no avisa y aparece en
 * el peor momento: cuando hay que sacar un arreglo con prisa.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname ?? ".", "..");

test("el fichero de la fuente está en el repositorio", () => {
  const f = join(raiz, "app/fuentes/InterTight-latin.woff2");
  assert.ok(existsSync(f), "falta la fuente: el build volvería a depender de Google");
  const bytes = statSync(f).size;
  assert.ok(bytes > 10_000 && bytes < 200_000, `tamaño raro: ${bytes} bytes`);
  // Cabecera de WOFF2, por si alguna vez se guarda un HTML de error en su sitio.
  assert.equal(readFileSync(f).subarray(0, 4).toString("latin1"), "wOF2");
});

test("nadie descarga tipografías al compilar", () => {
  const vistos: string[] = [];
  const mirar = (d: string) => {
    for (const e of readdirSync(join(raiz, d), { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) mirar(p);
      else if (/\.tsx?$/.test(e.name) && readFileSync(join(raiz, p), "utf8").includes("next/font/google")) {
        vistos.push(p);
      }
    }
  };
  for (const d of ["app", "components", "lib"]) mirar(d);
  assert.deepEqual(vistos, [], `usan next/font/google: ${vistos.join(", ")}`);
});
