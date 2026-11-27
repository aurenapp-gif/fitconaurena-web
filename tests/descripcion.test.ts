/**
 * La descripción del sitio, que es de donde salen las tres.
 *
 * Next hereda `description` a og:description y twitter:description, así que
 * una sola línea manda en los tres sitios y en todas las páginas que no
 * pongan la suya. Comprobado en el HTML de producción.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname ?? ".", "..");

test("«sin permanencia» no vuelve a aparecer en ningún sitio", () => {
  // Contradecía la cláusula 8 de los propios términos, que fija doce meses y
  // vencimiento anticipado de todas las cuotas si se impaga una.
  const vistos: string[] = [];
  const mirar = (d: string) => {
    for (const e of readdirSync(join(raiz, d), { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { mirar(p); continue; }
      if (!/\.(tsx?|md|json|html|webmanifest)$/.test(e.name)) continue;
      if (statSync(join(raiz, p)).size > 400_000) continue;
      if (/sin permanencia/i.test(readFileSync(join(raiz, p), "utf8"))) vistos.push(p);
    }
  };
  for (const d of ["app", "components", "lib", "public"]) mirar(d);
  assert.deepEqual(vistos, [], `sigue apareciendo en: ${vistos.join(", ")}`);
});

test("y la descripción dice los doce meses", () => {
  const layout = readFileSync(join(raiz, "app/layout.tsx"), "utf8");
  assert.match(layout, /Programa de 12 meses\./);
  assert.match(layout, /\+400 mujeres transformadas\.",/);
});
