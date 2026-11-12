/**
 * El diagnóstico de SQL pendiente.
 *
 * No se puede consultar la base de datos desde aquí, así que la pregunta
 * «¿qué me falta por ejecutar?» solo se puede responder preguntándosela a
 * ella. Esto genera esa pregunta a partir de los propios ficheros, para que
 * no haya que acordarse de cuál se ejecutó y cuál no.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname ?? ".", "..");
const diag = readFileSync(join(raiz, "supabase/00-QUE-FALTA.sql"), "utf8");

test("solo lee: no crea, no cambia y no borra", () => {
  // Se pega en producción: tiene que ser imposible que estropee algo.
  assert.doesNotMatch(diag, /\b(create|alter|drop|insert|update|delete|truncate|grant)\b/i);
  assert.match(diag, /^\s*--/);
});

test("comprueba todas las tablas y columnas que declaran los ficheros", () => {
  const dir = join(raiz, "supabase");
  const tablas = new Set<string>();
  const cols = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".sql") || f.startsWith("00-")) continue;
    const t = readFileSync(join(dir, f), "utf8");
    for (const m of Array.from(t.matchAll(/create table if not exists\s+public\.([a-z_]+)/gi))) tablas.add(m[1].toLowerCase());
    for (const m of Array.from(t.matchAll(/alter table\s+(?:if exists\s+)?public\.([a-z_]+)\s+add column if not exists\s+([a-z_]+)/gi))) {
      cols.add(`${m[1].toLowerCase()},${m[2].toLowerCase()}`);
    }
  }
  assert.ok(tablas.size > 20, `pocas tablas encontradas: ${tablas.size}`);
  for (const t of Array.from(tablas)) assert.ok(diag.includes(`('${t}')`), `falta comprobar la tabla ${t}`);
  for (const c of Array.from(cols)) {
    const [t, col] = c.split(",");
    assert.ok(diag.includes(`('${t}','${col}')`), `falta comprobar ${t}.${col}`);
  }
});

test("las columnas de la revisión quincenal están entre lo que comprueba", () => {
  // Son las que fallaban en producción: 22 clientas con «agua_media» y 3 con
  // «comidas_fuera». Si el diagnóstico no las mirase, no serviría de nada.
  for (const c of ["agua_media", "comidas_fuera", "pasos_media", "dias_entreno", "cumplimiento"]) {
    assert.ok(diag.includes(`('check_ins','${c}')`), `no comprueba check_ins.${c}`);
  }
});
