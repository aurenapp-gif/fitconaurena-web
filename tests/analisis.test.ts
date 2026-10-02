/**
 * El analizador.
 *
 * Lo que más importa probar no es que encuentre cosas, sino que NO se invente
 * ninguna: con pocos datos tiene que decir que faltan datos, y un número
 * dentro del margen de error no puede salir como un hallazgo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analizar, ritmoReciente, buscaPerderGrasa, resumenCorto, type DatosClienta } from "../lib/analisis";
import { grupoDe, seriesPorGrupo, normalizarNombre } from "../lib/musculos";

const HOY = "2026-10-02";
const dias = (n: number) => new Date(Date.parse(`${HOY}T10:00:00Z`) - n * 86400000).toISOString();
const dia = (n: number) => dias(n).slice(0, 10);

const base: DatosClienta = {
  objetivo: "Perder grasa",
  revisiones: [],
  habitos: [],
  series: [],
  pasosObjetivo: null,
  hoy: HOY,
};
const ids = (d: Partial<DatosClienta>) => analizar({ ...base, ...d }).map((x) => x.id);

// ---- Ritmo -----------------------------------------------------------------

test("sin dos pesos separados no se mide el ritmo", () => {
  assert.equal(ritmoReciente([]), null);
  assert.equal(ritmoReciente([{ created_at: dias(10), weight: 70 }]), null);
  // Dos pesos pero con 10 días entre ellos: muy poco para hablar de tendencia.
  assert.equal(ritmoReciente([{ created_at: dias(10), weight: 70 }, { created_at: dias(0), weight: 69 }]), null);
});

test("el ritmo se mide contra las últimas semanas, no contra el principio", () => {
  // Bajó mucho hace medio año y lleva seis semanas parada: tiene que salir parada.
  const r = ritmoReciente([
    { created_at: dias(180), weight: 80 },
    { created_at: dias(42), weight: 70 },
    { created_at: dias(0), weight: 69.9 },
  ])!;
  assert.ok(Math.abs(r.pctSemanal) < 0.1, `ritmo ${r.pctSemanal}`);
  assert.equal(r.semanas, 6);
});

test("bajar demasiado rápido sale como lo primero que mirar", () => {
  const h = analizar({
    ...base,
    revisiones: [{ created_at: dias(28), weight: 70 }, { created_at: dias(0), weight: 64 }],
  });
  const rapido = h.find((x) => x.id === "ritmo-rapido")!;
  assert.ok(rapido, "falta el hallazgo de ritmo rápido");
  assert.equal(rapido.prioridad, "alta");
  assert.equal(h[0].prioridad, "alta");
});

test("un ritmo bueno no se señala como problema", () => {
  const h = ids({ revisiones: [{ created_at: dias(28), weight: 70 }, { created_at: dias(0), weight: 68.6 }] });
  assert.ok(h.includes("ritmo-bien"));
  assert.ok(!h.includes("ritmo-parado"));
  assert.ok(!h.includes("ritmo-rapido"));
});

test("si no busca perder grasa, el ritmo no se juzga", () => {
  const h = ids({ objetivo: "Ganar músculo", revisiones: [{ created_at: dias(28), weight: 70 }, { created_at: dias(0), weight: 70 }] });
  assert.ok(!h.includes("ritmo-parado"));
  assert.ok(!h.includes("ritmo-rapido"));
});

test("buscaPerderGrasa reconoce cómo lo escribe el cuestionario", () => {
  assert.equal(buscaPerderGrasa("Perder grasa"), true);
  assert.equal(buscaPerderGrasa("Ganar músculo"), false);
  assert.equal(buscaPerderGrasa(null), false);
});

// ---- Sueño, pasos y constancia ---------------------------------------------

test("dormir menos de 6 horas es lo primero que mirar", () => {
  const habitos = Array.from({ length: 28 }, (_, i) => ({ day: dia(i), sleep: 5.5, steps: 9000 }));
  const h = analizar({ ...base, habitos });
  const s = h.find((x) => x.id === "sueno")!;
  assert.equal(s.prioridad, "alta");
});

test("con menos de siete días apuntados no se opina del sueño: se pide el dato", () => {
  const habitos = Array.from({ length: 3 }, (_, i) => ({ day: dia(i), sleep: 5 }));
  const h = ids({ habitos });
  assert.ok(h.includes("sin-sueno"));
  assert.ok(!h.includes("sueno"));
});

test("dormir bien y andar lo suficiente no generan hallazgos", () => {
  const habitos = Array.from({ length: 28 }, (_, i) => ({ day: dia(i), sleep: 8, steps: 9000 }));
  const h = ids({ habitos });
  assert.ok(!h.includes("sueno"));
  assert.ok(!h.includes("pasos"));
  assert.ok(!h.includes("constancia"));
});

test("apuntar poco sale como hallazgo, y casi nada sale como urgente", () => {
  // Lleva meses en el programa y solo ha apuntado un día en el último mes.
  const habitos = [{ day: dia(90), steps: 9000, sleep: 8 }, { day: dia(1), steps: 9000, sleep: 8 }];
  assert.ok(ids({ habitos }).includes("constancia"));
  assert.equal(analizar({ ...base, habitos }).find((x) => x.id === "constancia")!.prioridad, "alta");
});

test("a una clienta recién entrada no se le reprocha la constancia", () => {
  const h = ids({ habitos: [{ day: dia(1), steps: 9000, sleep: 8 }] });
  assert.ok(h.includes("recien-entrada"));
  assert.ok(!h.includes("constancia"));
});

// ---- Cintura ---------------------------------------------------------------

test("un salto de cintura sin cambio de peso se marca como mal medida", () => {
  const h = analizar({
    ...base,
    revisiones: [
      { created_at: dias(14), weight: 98.1, waist: 95 },
      { created_at: dias(0), weight: 97.3, waist: 85 },
    ],
  });
  const c = h.find((x) => x.id === "cintura-imposible")!;
  assert.ok(c, "no ha detectado la medida imposible");
  assert.match(c.quehacer, /ombligo/);
});

test("un cambio de cintura menor que el error de medida no es una señal", () => {
  const h = ids({
    revisiones: [
      { created_at: dias(14), weight: 70, waist: 80 },
      { created_at: dias(0), weight: 70, waist: 78.8 },
    ],
  });
  assert.ok(h.includes("cintura-ruido"));
  assert.ok(!h.includes("cintura-imposible"));
});

test("bajar mucha cintura con mucho peso sí es real", () => {
  const h = ids({
    revisiones: [
      { created_at: dias(60), weight: 90, waist: 100 },
      { created_at: dias(0), weight: 84, waist: 94 },
    ],
  });
  assert.ok(!h.includes("cintura-imposible"));
});

// ---- Ciclo -----------------------------------------------------------------

test("una subida de peso en fase lútea se avisa antes de cambiar nada", () => {
  const h = ids({
    revisiones: [
      { created_at: dias(14), weight: 70 },
      { created_at: dias(0), weight: 70.8 },
    ],
    habitos: [{ day: dia(0), cycle_day: 24 }],
  });
  assert.ok(h.includes("ciclo-lutea"));
});

// ---- Fuerza ----------------------------------------------------------------

test("los grupos con pocas series salen señalados", () => {
  // 8 series de glúteo en 4 semanas = 2 por semana.
  const series = Array.from({ length: 8 }, (_, i) => ({ ejercicio: "Hip thrust", peso: 60, reps: 10, created_at: dias(i + 1) }));
  const h = analizar({ ...base, series });
  const v = h.find((x) => x.id === "volumen")!;
  assert.ok(v, "no ha visto el volumen bajo");
  assert.match(v.dato, /Glúteo/);
});

test("un ejercicio que no se reconoce no se cuenta en ningún grupo, y se dice", () => {
  const series = Array.from({ length: 12 }, (_, i) => ({ ejercicio: "Invento raro", peso: 10, reps: 10, created_at: dias(i + 1) }));
  const h = analizar({ ...base, series });
  assert.ok(h.some((x) => x.id === "sin-clasificar"));
  assert.ok(!h.some((x) => x.id === "volumen"), "no debería contar un ejercicio desconocido");
});

test("lo que lleva un mes sin subir sale como estancado", () => {
  const series = [
    { ejercicio: "Sentadilla", peso: 60, reps: 10, created_at: dias(40) },
    { ejercicio: "Sentadilla", peso: 60, reps: 10, created_at: dias(5) },
  ];
  const h = ids({ series });
  assert.ok(h.includes("progresion"));
});

// ---- Grupos musculares -----------------------------------------------------

test("el nombre se reconoce aunque esté en mayúsculas, con tildes o con series detrás", () => {
  assert.equal(grupoDe("HIP THRUST 4x12"), "gluteo");
  assert.equal(grupoDe("Extensión de cuádriceps"), "cuadriceps");
  assert.equal(grupoDe("jalón al pecho"), "espalda");
  assert.equal(normalizarNombre("  Elevación   LATERAL "), "elevacion lateral");
});

test("el peso muerto rumano es femoral, no espalda", () => {
  assert.equal(grupoDe("Peso muerto rumano"), "femoral");
  assert.equal(grupoDe("Peso muerto"), "espalda");
});

test("lo que no se reconoce se queda sin clasificar en vez de repartirse", () => {
  assert.equal(grupoDe("cosa rara"), null);
  const { porGrupo, sinClasificar } = seriesPorGrupo([
    { ejercicio: "Hip thrust" }, { ejercicio: "Hip thrust" }, { ejercicio: "cosa rara" },
  ]);
  assert.equal(porGrupo.get("gluteo"), 2);
  assert.deepEqual(sinClasificar, ["cosa rara"]);
});

// ---- Resumen ---------------------------------------------------------------

test("el resumen corto dice lo urgente antes que lo demás", () => {
  assert.equal(resumenCorto([{ id: "a", prioridad: "alta", titulo: "", dato: "", quehacer: "" }]), "1 cosa urgente");
  assert.equal(resumenCorto([{ id: "b", prioridad: "media", titulo: "", dato: "", quehacer: "" }]), "1 ajuste");
  assert.equal(resumenCorto([]), "Nada que tocar");
});

test("sin datos no se opina: todo lo que sale es «falta este dato»", () => {
  const h = analizar(base);
  assert.ok(h.length > 0);
  assert.ok(h.every((x) => x.prioridad === "info"), h.map((x) => `${x.id}:${x.prioridad}`).join(","));
});

test("con revisiones el 1 y el 15, el ritmo se mide igual", () => {
  // Las dos últimas están a 16 días: solas no llegan a las 3 semanas, así que
  // hay que irse a la anterior en vez de decir que no se puede medir.
  const r = ritmoReciente([
    { created_at: dias(44), weight: 64.2 },
    { created_at: dias(16), weight: 63 },
    { created_at: dias(0), weight: 62.25 },
  ]);
  assert.ok(r, "no ha podido medir el ritmo con revisiones quincenales");
  assert.equal(r!.semanas, 44 / 7);
});

test("no se va a buscar un peso de hace medio año para rellenar", () => {
  assert.equal(
    ritmoReciente([{ created_at: dias(200), weight: 80 }, { created_at: dias(0), weight: 70 }]),
    null
  );
});
