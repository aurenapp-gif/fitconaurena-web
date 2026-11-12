/**
 * Mover un plan de una clienta a otra.
 *
 * Dos clientas se llaman parecido y el plan acaba en la ficha equivocada. La
 * única salida era borrarlo y volver a subirlo: se pierde la lectura del plan
 * —y hay que pagarla otra vez— y la fecha real de entrega.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const ruta = leer("app/api/miembros/clientas/plan/route.ts");
const mover = leer("components/PlanMover.tsx");

test("mover un plan es solo de la coach, no del equipo", () => {
  // Saca un plan de la vista de una persona y se lo da a otra: más que
  // cambiarle el tipo, que sí puede el equipo.
  assert.match(ruta, /if \(!isAdmin\(me\)\) return NextResponse\.json\(\{ error: "Solo la coach puede mover un plan\." \}, \{ status: 403 \}\);/);
});

test("la clienta de destino tiene que existir", () => {
  // Un correo mal escrito dejaría el plan en tierra de nadie: no lo vería ni
  // una ni otra.
  assert.match(ruta, /No hay ninguna clienta con ese correo\./);
  assert.match(ruta, /status: 404/);
});

test("no se mueve un plan a quien ya lo tiene", () => {
  assert.match(ruta, /Ese plan ya es suyo\./);
});

test("si ya había entrenado con él, se avisa antes de nada", () => {
  // Sus series quedan apuntadas contra un plan que deja de ser suyo: siguen
  // guardadas, pero ella no las vuelve a ver.
  assert.match(ruta, /sbSelect<\{ id: string \}>\("workout_sessions", `select=id&plan_id=eq\.\$\{id\}`\)/);
  assert.match(ruta, /sesiones,/);
  assert.match(mover, /d\.sesiones > 0/);
});

test("se elige de una lista, no se teclea el correo", () => {
  // El fallo que esto arregla nace de confundir a dos personas parecidas.
  assert.match(mover, /<select value=\{destino\}/);
  assert.doesNotMatch(mover, /type="email"|type="text"/);
});

test("y se confirma diciendo a quién va", () => {
  assert.match(mover, /confirm\(`¿Mover «\$\{etiqueta\}» a \$\{quien\}\?/);
});
