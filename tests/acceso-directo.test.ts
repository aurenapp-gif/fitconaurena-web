/**
 * «Que entre sin nada»: ni bienvenida, ni contrato, ni espera.
 *
 * Para invitadas y pruebas. La bienvenida NO es un trámite decorativo: ahí
 * acepta las condiciones con una casilla sin premarcar y deja los datos que
 * el contrato necesita. Quien entre por aquí entra sin haberlas aceptado, y
 * eso tiene que quedar dicho antes de pulsar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const ruta = leer("app/api/miembros/clientas/acceso-directo/route.ts");
const boton = leer("components/AccesoDirecto.tsx");

test("solo la coach puede concederlo", () => {
  assert.match(ruta, /if \(!me \|\| !isAdmin\(me\)\) return NextResponse\.json\(\{ error: "No autorizado\." \}, \{ status: 403 \}\);/);
});

test("abre las tres puertas de entrada de una vez", () => {
  assert.match(ruta, /onboarding_completed_at: new Date\(\)\.toISOString\(\)/);
  assert.match(ruta, /contracts_exempt: true/);
  assert.match(ruta, /access_from: null/);
});

test("no da de alta: la persona tiene que existir ya", () => {
  // Si no está en la plataforma, el enlace de acceso no le llegaría igual.
  assert.match(ruta, /Dala de alta primero/);
  assert.match(ruta, /status: 404/);
});

test("al retirarlo no se le borra una bienvenida hecha de verdad", () => {
  // Borrarla la obligaría a repetirla sin motivo.
  assert.match(ruta, /\{ email, contracts_exempt: false, updated_at/);
  assert.doesNotMatch(ruta, /onboarding_completed_at: null/);
});

test("avisa de lo que se salta ANTES de hacerlo", () => {
  assert.match(boton, /Entrará SIN haber aceptado las condiciones/);
  assert.match(boton, /confirm\(/);
});
