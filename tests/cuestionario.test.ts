/**
 * El aviso del cuestionario: a quién se le enseña y a quién no.
 *
 * El caso que importa es el de las clientas de antes: rellenaron sus datos
 * cuando no existía el botón «Enviar cuestionario», así que no tienen fecha de
 * entrega. Si se les avisara, verían un aviso en su portada por algo que ya
 * hicieron hace meses.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cuestionarioPendiente, REQUIRED_QUESTIONNAIRE } from "../lib/profile";

const completo = { fecha_nacimiento: "1990-04-12", altura: "165", objetivo: "Perder grasa" };

test("una clienta nueva, sin nada relleno, tiene el cuestionario pendiente", () => {
  assert.equal(cuestionarioPendiente({ questionnaire: {}, questionnaire_completed_at: null }), true);
  assert.equal(cuestionarioPendiente({ questionnaire: null, questionnaire_completed_at: null }), true);
});

test("quien lo entregó no recibe aviso", () => {
  assert.equal(
    cuestionarioPendiente({ questionnaire: completo, questionnaire_completed_at: "2026-09-01T10:00:00Z" }),
    false
  );
});

test("tenerlo relleno cuenta como hecho, aunque nunca pulsara «Enviar»", () => {
  assert.equal(cuestionarioPendiente({ questionnaire: completo, questionnaire_completed_at: null }), false);
});

test("la edad del cuestionario antiguo vale por la fecha de nacimiento", () => {
  assert.equal(
    cuestionarioPendiente({ questionnaire: { edad: "36", altura: "165", objetivo: "Tonificar" }, questionnaire_completed_at: null }),
    false
  );
});

test("a medias sigue pendiente: falta alguno de los obligatorios", () => {
  for (const k of REQUIRED_QUESTIONNAIRE) {
    const q: Record<string, string> = { ...completo };
    delete q[k];
    if (k === "fecha_nacimiento") delete q.edad;
    assert.equal(cuestionarioPendiente({ questionnaire: q, questionnaire_completed_at: null }), true, `falta ${k}`);
  }
});

test("un espacio en blanco no es una fecha de entrega", () => {
  assert.equal(cuestionarioPendiente({ questionnaire: {}, questionnaire_completed_at: "   " }), true);
});

test("sin ficha no se avisa: la consulta pudo fallar y avisar en falso es peor", () => {
  assert.equal(cuestionarioPendiente(null), false);
  assert.equal(cuestionarioPendiente(undefined), false);
});

/* ---- Cambiar el cuestionario después de enviarlo -------------------------- */

import { readFileSync as leerArchivo } from "node:fs";
import { join as unir } from "node:path";
const fuente = (p: string) => leerArchivo(unir(import.meta.dirname ?? ".", "..", p), "utf8");

test("cambiar el cuestionario ya enviado avisa a la coach, el primer envío no", () => {
  const api = fuente("app/api/miembros/perfil/route.ts");
  // Solo avisa si YA estaba enviado y además ha cambiado algo.
  assert.match(api, /const yaEstaba = [^\n]*questionnaire_completed_at[^\n]*!questionnaire_completed_at/);
  assert.match(api, /const cambio = JSON\.stringify/);
  assert.match(api, /if \(yaEstaba && cambio && rateLimit\(/);
});

test("no se avisa dos veces por hora mientras edita", () => {
  const api = fuente("app/api/miembros/perfil/route.ts");
  assert.match(api, /rateLimit\(`cuestionario-aviso:\$\{email\}`, 1, 3600_000\)/);
});

test("el aviso del cuestionario no lo puede mandar el navegador", () => {
  const act = fuente("lib/activity.ts");
  const solo = act.slice(act.indexOf("const SOLO_SERVIDOR"), act.indexOf("/** ¿Es una acción"));
  assert.match(solo, /cuestionario_actualizado/);
});

test("ninguna acción del historial se queda sin texto en castellano", () => {
  // La ficha de la clienta tenía su propia lista de etiquetas y se quedaba
  // atrás: las acciones nuevas salían con su clave suelta («onboarding_visto»).
  const page = fuente("app/miembros/clientas/[email]/page.tsx");
  assert.match(page, /ACTIONS\[a\.action as keyof typeof ACTIONS\]/);
});

/* ---- El cajón de texto libre --------------------------------------------- */

import { PROFILE_FIELDS, sanitizeQuestionnaire } from "../lib/profile";

test("hay un sitio para escribir largo, y de verdad cabe", () => {
  const libre = PROFILE_FIELDS.find((f) => f.id === "notas");
  assert.ok(libre, "falta el campo de texto libre");
  assert.ok((libre!.filas ?? 2) >= 6, "tiene que verse grande, no de dos líneas");
  assert.ok((libre!.limite ?? 1000) >= 4000, "tiene que caber mucho texto");
  assert.match(libre!.hint ?? "", /sienta mal/);
});

test("lo escrito largo no se corta a mitad al guardarlo", () => {
  const largo = "a".repeat(3500);
  const out = sanitizeQuestionnaire({ notas: largo, lesiones: "b".repeat(3500) });
  assert.equal(out.notas.length, 3500, "el cajón libre se guarda entero");
  // Los demás campos siguen con su tope de siempre.
  assert.equal(out.lesiones.length, 1000);
});

test("tampoco cabe un texto infinito: hay tope", () => {
  const out = sanitizeQuestionnaire({ notas: "a".repeat(9000) });
  assert.equal(out.notas.length, 4000);
});
