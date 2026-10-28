/**
 * Ver el plan como ella quiera: en la app o en PDF.
 *
 * La vista de la app está hecha para entrenar con el móvil en la mano; el PDF
 * lleva las indicaciones, las imágenes y las notas de la coach. Las dos
 * sirven, y según el día se quiere una u otra, así que no se elige por ella.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const entreno = leer("components/Entreno.tsx");
const perfil = leer("app/miembros/perfil/page.tsx");
const ficha = leer("app/miembros/clientas/[email]/page.tsx");

test("desde el entreno puede abrir el PDF de ESE plan", () => {
  assert.match(entreno, /function ComoVerlo\(\{ planId \}/);
  assert.match(entreno, /href=\{`\/api\/miembros\/plan\/\$\{planId\}`\}/);
});

test("y si no se pudieron sacar los ejercicios, el PDF está ahí mismo", () => {
  // Es el caso en el que más falta hace: sin ejercicios, el PDF es lo único
  // que tiene, y antes había que ir a buscarlo a otra pantalla.
  const bloque = entreno.slice(entreno.indexOf("no he podido sacar los ejercicios"));
  assert.match(bloque.slice(0, 1200), /Ver el PDF de este plan/);
});

test("el PDF sigue a mano con el entreno en marcha", () => {
  // Abrirlo es una pestaña nueva: no toca la sesión. Lo que no se cambia a
  // mitad de entreno es el plan, y para eso está «Descartar este entreno».
  assert.match(entreno, /\n      <ComoVerlo planId=\{planId\} \/>/);
  assert.match(entreno, /Descartar este entreno/);
});

test("y dentro de un ejercicio, que es donde hacen falta las indicaciones", () => {
  // La vista de la app da el nombre, las series y las casillas del peso; cómo
  // se hace el ejercicio lo escribe la coach en el PDF.
  const vista = entreno.slice(entreno.indexOf("function VistaEjercicio("));
  assert.match(vista, /Ver el PDF del plan/);
  assert.match(vista, /href=\{`\/api\/miembros\/plan\/\$\{planId\}`\}/);
});

test("desde Mi plan puede entrar a entrenar con cualquiera de ellos", () => {
  assert.match(perfil, /href=\{`\/miembros\/entreno\?plan=\$\{actual\.id\}`\}/);
  assert.match(perfil, /href=\{`\/miembros\/entreno\?plan=\$\{p\.id\}`\}/);
});

test("eso solo sale en los planes de entrenamiento", () => {
  // En alimentación no hay nada que apuntar: ofrecerlo sería ruido.
  assert.match(perfil, /entrenamiento\?: boolean;/);
  assert.match(perfil, /items=\{entPlans\}[^/]*entrenamiento \/>/);
});

test("el selector de plan sigue estando aunque no se pueda leer", () => {
  // Para poder salir de un plan ilegible sin dar un rodeo.
  assert.match(entreno, /\{!sinPlan && <SelectorPlan planes=\{planes\} actual=\{planId\} \/>\}/);
});

test("en la ficha de la clienta el plan tampoco se enlaza firmado", () => {
  // El firmado de Supabase caduca en una hora: una ficha abierta un rato y
  // luego el plan pulsado daba el mismo error que tenían ellas.
  assert.match(ficha, /url: `\/api\/miembros\/plan\/\$\{p\.id\}`/);
  assert.doesNotMatch(ficha, /href=\{p\.url\}[\s\S]{0,80}>Ver<\/a>\s*\n\s*: <span className="text-danger"/);
});

test("pero se sigue avisando del plan cuyo archivo no está", () => {
  // Firmar sigue siendo la forma de saber si el archivo existe; lo que cambia
  // es que ya no es el enlace.
  assert.match(ficha, /enElAlmacen: await sbSignedUrl\("planes"/);
  assert.match(ficha, /\{p\.enElAlmacen/);
  assert.match(ficha, /sin archivo/);
});

test("y no se firma nada que no se use", () => {
  // Era una llamada a Supabase por plan y por visita que no pintaba nada.
  assert.doesNotMatch(perfil, /urlFirmada/);
});
