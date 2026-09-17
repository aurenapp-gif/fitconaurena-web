/**
 * «¿Cuánto levanté la última vez?» y lo que se puede guardar.
 *
 * Dos cosas se prueban aquí y las dos son de las que no avisan cuando fallan:
 * que «la última vez» sea de verdad la última vez de ESE ejercicio, y que un
 * dedazo en el peso no entre como si fuera un dato.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  claveEjercicio, compara, duracion, pesoValido, repsValidas, serieValida,
  segundosDescanso, textoPeso, textoUltimaVez, ultimaVezPorEjercicio, type SerieGuardada,
} from "../lib/entrenos";

const s = (
  ejercicio: string, serie: number, peso: number | null, reps: number | null,
  created_at: string, session_id = "s1"
): SerieGuardada & { session_id: string } => ({ ejercicio, serie, peso, reps, created_at, session_id });

test("un peso solo entra si se puede guardar de verdad", () => {
  assert.equal(pesoValido("42,5"), 42.5, "la coma decimal es lo que da el teclado español");
  assert.equal(pesoValido("42.5"), 42.5);
  assert.equal(pesoValido(0), 0, "cero vale: hay ejercicios sin carga");
  assert.equal(pesoValido(""), null);
  assert.equal(pesoValido(null), null);
  assert.equal(pesoValido(-5), null, "un peso negativo no existe");
  assert.equal(pesoValido(1000), null, "mil kilos es un dedazo, no un récord");
  assert.equal(pesoValido("cuarenta"), null);
  assert.equal(pesoValido(42.567), 42.57, "se redondea a céntimos de kilo");

  assert.equal(repsValidas("8"), 8);
  assert.equal(repsValidas(8.5), null, "media repetición no se apunta");
  assert.equal(repsValidas(-1), null);
  assert.equal(repsValidas(""), null);

  assert.equal(serieValida(1), 1);
  assert.equal(serieValida(20), 20);
  assert.equal(serieValida(21), null, "más de veinte series no es una sesión");
  assert.equal(serieValida(0), null);
});

test("dos ejercicios que se llaman igual son el mismo, aunque se escriban distinto", () => {
  assert.equal(claveEjercicio("Sentadilla"), claveEjercicio("sentadilla"));
  assert.equal(claveEjercicio("Elevación  de gemelo"), claveEjercicio("elevacion de gemelo"));
  assert.notEqual(claveEjercicio("Prensa"), claveEjercicio("Prensa inclinada"));
});

test("«la última vez» es el día anterior, no la última serie suelta", () => {
  // Orden real: de lo más reciente a lo más antiguo.
  const u = ultimaVezPorEjercicio([
    s("Sentadilla", 3, 40, 8, "2026-09-10T10:20:00Z", "b"),
    s("Sentadilla", 2, 45, 8, "2026-09-10T10:10:00Z", "b"),
    s("Sentadilla", 1, 42.5, 8, "2026-09-10T10:00:00Z", "b"),
    s("Sentadilla", 1, 35, 8, "2026-09-03T10:00:00Z", "a"),
  ]);
  const sent = u.get(claveEjercicio("Sentadilla"))!;
  assert.equal(sent.peso, 45, "se recuerda la serie más pesada de aquel día, no la última (que suele ser la floja)");
  assert.equal(sent.series, 3, "y cuántas series hizo");
  assert.ok(!sent.cuando.startsWith("2026-09-03"), "el día viejo no se mezcla con el nuevo");
});

test("el entreno de hoy no se compara consigo mismo", () => {
  const series = [
    s("Prensa", 1, 80, 12, "2026-09-17T18:00:00Z", "hoy"),
    s("Prensa", 1, 70, 12, "2026-09-14T18:00:00Z", "antes"),
  ];
  assert.equal(
    ultimaVezPorEjercicio(series, "hoy").get(claveEjercicio("Prensa"))!.peso, 70,
    "excluyendo la sesión abierta, «la última vez» son los 70 del día 14"
  );
  assert.equal(
    ultimaVezPorEjercicio(series).get(claveEjercicio("Prensa"))!.peso, 80,
    "sin excluirla, se cuela la de hoy: por eso la página la excluye"
  );
});

test("cada ejercicio lleva su propia cuenta", () => {
  const u = ultimaVezPorEjercicio([
    s("Sentadilla", 1, 40, 8, "2026-09-10T10:00:00Z", "b"),
    s("Zancadas", 1, 12, 12, "2026-09-03T10:00:00Z", "a"),
  ]);
  assert.equal(u.get(claveEjercicio("Sentadilla"))!.peso, 40);
  assert.equal(u.get(claveEjercicio("Zancadas"))!.peso, 12, "aunque su último día sea otro");
  assert.equal(u.get(claveEjercicio("Remo")), undefined, "un ejercicio que nunca hizo no aparece");
});

test("la comparación con la última vez", () => {
  assert.deepEqual(compara(42.5, 40), { delta: 2.5, texto: "+2,5 kg", sentido: "sube" });
  assert.deepEqual(compara(40, 45), { delta: -5, texto: "−5 kg", sentido: "baja" });
  assert.equal(compara(40, 40).sentido, "igual");
  assert.equal(compara(40, null).sentido, "nuevo", "sin referencia no se inventa una mejora");
  assert.equal(compara(null, 40).sentido, "nuevo");
  assert.match(compara(40, 45).texto, /−/, "el menos es el signo tipográfico, no un guion");
});

test("cómo se lee en pantalla", () => {
  assert.equal(textoPeso(42.5), "42,5 kg");
  assert.equal(textoPeso(null), "—");
  assert.equal(textoUltimaVez({ peso: 70, reps: 12, series: 3, cuando: "2026-09-14T18:00:00Z" }), "3×12 con 70 kg");
  assert.equal(textoUltimaVez({ peso: null, reps: 15, series: 4, cuando: "2026-09-14T18:00:00Z" }), "4×15");
  assert.equal(duracion("2026-09-17T18:00:00Z", "2026-09-17T18:48:00Z"), "48 min");
  assert.equal(duracion("2026-09-17T18:00:00Z", "2026-09-17T19:12:00Z"), "1 h 12 min");
  assert.equal(duracion("2026-09-17T18:00:00Z", "2026-09-17T19:00:00Z"), "1 h");
});

test("el descanso del plan, en segundos", () => {
  assert.equal(segundosDescanso("90 s"), 90);
  assert.equal(segundosDescanso('90"'), 90);
  assert.equal(segundosDescanso("90 seg"), 90);
  assert.equal(segundosDescanso("2 min"), 120);
  assert.equal(segundosDescanso("1:30"), 90, "también se escribe como un reloj");
  assert.equal(segundosDescanso("1,5 min"), 90, "y con coma decimal");
  assert.equal(segundosDescanso(null), null);
  assert.equal(segundosDescanso("el que necesites"), null, "si no se entiende, no se enseña cuenta atrás");
  assert.equal(segundosDescanso("2 s"), null, "dos segundos no es un descanso");
  assert.equal(segundosDescanso("30 min"), null, "media hora tampoco: será otra cosa escrita ahí");
});

test("una duración por debajo del minuto se dice con palabras", () => {
  assert.equal(
    duracion("2026-09-17T18:00:00Z", "2026-09-17T18:00:16Z"), "menos de un minuto",
    "«0 min» se lee como si no hubiera entrenado"
  );
  assert.equal(duracion("2026-09-17T18:00:00Z", "2026-09-17T18:01:00Z"), "1 min");
});
