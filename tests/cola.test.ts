/**
 * Dos guardados de la misma serie.
 *
 * El caso real: al salir del peso se guarda sin repeticiones y al salir de las
 * repeticiones se guarda entero. Si el primero llega el último, borra las
 * repeticiones. Aquí se simula justo eso: el primero tarda más que el segundo.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { enCola } from "../lib/cola";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("dos escrituras de la misma serie llegan en orden aunque la primera sea lenta", async () => {
  const colas = new Map<string, Promise<unknown>>();
  const llegadas: string[] = [];

  const lenta = enCola(colas, "1", async () => { await espera(40); llegadas.push("peso"); });
  const rapida = enCola(colas, "1", async () => { await espera(1); llegadas.push("peso+reps"); });
  await Promise.all([lenta, rapida]);

  assert.deepEqual(llegadas, ["peso", "peso+reps"], "la última que ella escribe es la que manda");
});

test("series distintas no se esperan entre sí", async () => {
  const colas = new Map<string, Promise<unknown>>();
  const llegadas: string[] = [];
  await Promise.all([
    enCola(colas, "1", async () => { await espera(30); llegadas.push("serie 1"); }),
    enCola(colas, "2", async () => { await espera(1); llegadas.push("serie 2"); }),
  ]);
  assert.deepEqual(llegadas, ["serie 2", "serie 1"], "una serie atascada no frena a las demás");
});

test("si una falla, la siguiente sigue saliendo", async () => {
  const colas = new Map<string, Promise<unknown>>();
  const primera = enCola(colas, "1", async () => { throw new Error("sin cobertura"); });
  await assert.rejects(primera, /sin cobertura/);
  assert.equal(await enCola(colas, "1", async () => "guardada"), "guardada");
});
