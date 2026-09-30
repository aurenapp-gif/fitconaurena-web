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
