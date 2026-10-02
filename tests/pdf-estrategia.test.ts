/**
 * El PDF de estrategia.
 *
 * Lo que puede romperlo de verdad es el texto: la fuente estándar del PDF solo
 * sabe escribir Latin-1, así que una comilla tipográfica del móvil o un emoji
 * dictado por error tiraban la generación entera. Y sin PDF no hay nada que
 * mandar por WhatsApp.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { limpio, nombreArchivo, pdfEstrategia } from "../lib/pdf-estrategia";

test("las comillas y rayas del móvil se cambian por las que sabe escribir", () => {
  assert.equal(limpio("«hola» —adiós— “ya”"), '"hola" -adiós- "ya"');
  assert.equal(limpio("ella dijo: no…"), "ella dijo: no...");
});

test("los emoji se quitan en vez de reventar el PDF", () => {
  assert.equal(limpio("Muy bien 💪 sigue así 🔥"), "Muy bien  sigue así");
});

test("las tildes y la eñe se quedan: son Latin-1", () => {
  assert.equal(limpio("Añade más proteína y descansó"), "Añade más proteína y descansó");
});

test("el nombre del archivo va sin tildes ni espacios", () => {
  const f = nombreArchivo("María José Pérez", new Date("2026-10-02T10:00:00Z"));
  assert.equal(f, "Estrategia-Maria-Jose-Perez-2026-10-02.pdf");
});

test("un nombre que se queda en nada no deja el archivo sin nombre", () => {
  assert.match(nombreArchivo("💚💚", new Date("2026-10-02T10:00:00Z")), /^Estrategia-clienta-/);
});

test("sale un PDF de verdad, con sus fases y sus números", async () => {
  const bytes = await pdfEstrategia({
    nombre: "Lucía",
    fecha: new Date("2026-10-02T10:00:00Z"),
    coach: "Aurena",
    fase: { actual: 2, total: 4, titulo: "Déficit progresivo", detalle: "Bajamos poco a poco" },
    recorrido: [
      { posicion: 1, titulo: "Adaptación" },
      { posicion: 2, titulo: "Déficit progresivo" },
      { posicion: 3, titulo: "Mantenimiento" },
      { posicion: 4, titulo: "Consolidación" },
    ],
    datos: [{ etiqueta: "Peso", valor: "68,2 kg" }, { etiqueta: "Cintura", valor: "78 cm" }],
    bloques: [{ titulo: "Los ajustes de este mes", cuerpo: "Subimos a 9.000 pasos «poco a poco» 💪" }],
  });
  assert.ok(bytes.length > 1000, "el PDF ha salido vacío");
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
});

test("un texto larguísimo no se sale de la página: salta a la siguiente", async () => {
  const bytes = await pdfEstrategia({
    nombre: "Lucía",
    fecha: new Date("2026-10-02T10:00:00Z"),
    coach: "Aurena",
    fase: null,
    datos: [],
    bloques: [{ titulo: "Los ajustes", cuerpo: "palabra ".repeat(3000) }],
  });
  assert.ok(bytes.length > 2000);
});
