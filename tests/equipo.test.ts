/**
 * Los tres papeles: CEO, equipo y clienta.
 *
 * Lo que de verdad hay que proteger aquí es el «por omisión»: cualquier cosa
 * que no se haya abierto a propósito tiene que seguir siendo solo del CEO, y
 * un fallo leyendo la base NUNCA puede acabar dando permisos.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname ?? ".", "..");

/** Lee un archivo del proyecto. */
const leer = (p: string) => readFileSync(join(RAIZ, p), "utf8");

test("el CEO vive en una variable de entorno, no en la base de datos", () => {
  // Si el CEO saliera de una tabla, un fallo de Supabase —o alguien tocando
  // esa tabla— podría dejarle fuera de su propia empresa.
  const members = leer("lib/members.ts");
  assert.match(members, /ADMIN_EMAILS/);
  // Y el equipo no la lee ni la reescribe: solo pregunta por isAdmin.
  const equipo = leer("lib/equipo.ts");
  assert.ok(!/process\.env/.test(equipo), "el equipo no debe leer variables de entorno");
});

test("si falla la consulta del equipo, nadie entra", () => {
  const s = leer("lib/equipo.ts");
  // El catch tiene que dejar el conjunto VACÍO, no devolver algo permisivo.
  assert.match(s, /catch[\s\S]*?new Set\(\)/);
  assert.ok(!/catch[\s\S]{0,200}return true/.test(s), "un fallo no puede conceder permisos");
});

test("el CEO no cuenta como equipo", () => {
  const s = leer("lib/equipo.ts");
  assert.match(s, /if \(!email \|\| isAdmin\(email\)\) return false;/);
});

/**
 * La prueba que de verdad importa: ninguna pantalla ni API del dinero, los
 * contratos, los comunicados, las solicitudes o los ajustes puede dejar de
 * mirar `isAdmin`. Si alguien la cambia por el permiso del equipo, esto salta.
 */
const SOLO_CEO = [
  "app/miembros/contabilidad/page.tsx",
  "app/miembros/contratos/page.tsx",
  "app/miembros/leads/page.tsx",
  "app/miembros/admin/page.tsx",
  "app/miembros/comunicados/page.tsx",
  "app/miembros/equipo/page.tsx",
  "app/api/miembros/contabilidad/route.ts",
  "app/api/miembros/contrato/asignar/route.ts",
  "app/api/miembros/contrato/plantilla/route.ts",
  "app/api/miembros/clientas/alta/route.ts",
  "app/api/miembros/clientas/eliminar/route.ts",
  "app/api/miembros/admin/ajustes/route.ts",
  "app/api/miembros/equipo/route.ts",
];

for (const archivo of SOLO_CEO) {
  test(`${archivo} sigue siendo solo del CEO`, () => {
    const s = leer(archivo);
    assert.match(s, /isAdmin\(/, "ha dejado de comprobar isAdmin");
    assert.ok(
      !/puedeGestionarClientas/.test(s),
      "esta pantalla no puede abrirse al equipo: ahí está el dinero, los contratos o los ajustes"
    );
  });
}

test("borrar una planificación sigue siendo cosa del CEO", () => {
  const s = leer("app/api/miembros/clientas/plan/route.ts");
  // El DELETE va después del POST y del PATCH; solo él conserva isAdmin.
  const borrar = s.slice(s.indexOf("export async function DELETE"));
  assert.match(borrar, /isAdmin\(me\)/);
  assert.ok(!/puedeGestionarClientas/.test(borrar), "el equipo no puede borrar planes");
});

test("subir una planificación sí lo puede hacer el equipo", () => {
  const s = leer("app/api/miembros/clientas/plan/route.ts");
  const subir = s.slice(s.indexOf("export async function POST"), s.indexOf("export async function PATCH"));
  assert.match(subir, /puedeGestionarClientas/);
});

test("no queda ninguna pantalla de coach sin decidir su papel", () => {
  // Toda página que pinte el menú de coach tiene que decir si es del CEO.
  const dir = join(RAIZ, "app/miembros");
  const pendientes: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (!entrada.isDirectory()) continue;
    const p = join(dir, entrada.name, "page.tsx");
    let s: string;
    try { s = readFileSync(p, "utf8"); } catch { continue; }
    if (!/<AppShell admin/.test(s)) continue;
    // O es solo del CEO (isAdmin sin permiso de equipo), o pasa `ceo={...}`.
    const soloCeo = /isAdmin\(/.test(s) && !/puedeGestionarClientas/.test(s);
    if (!soloCeo && !/ceo=\{/.test(s)) pendientes.push(entrada.name);
  }
  assert.deepEqual(pendientes, [], `estas pantallas no dicen qué ve el equipo: ${pendientes.join(", ")}`);
});

/* ---- El equipo no es clienta -------------------------------------------- */

test("las listas de clientas dejan fuera al equipo y a la coach", () => {
  // La prueba mira el código, no la base: lo que importa es que estas tres
  // pantallas sigan filtrando. Son las que mandan correos o cuentan clientas.
  for (const archivo of [
    "app/miembros/checkins/page.tsx",
    "app/api/cron/route.ts",
    "app/miembros/comunicados/page.tsx",
  ]) {
    assert.match(leer(archivo), /soloClientas/, `${archivo} lista clientas sin filtrar al equipo`);
  }
});

test("el filtro deja fuera al CEO aunque la lista del equipo falle", () => {
  const s = leer("lib/equipo.ts");
  const fn = s.slice(s.indexOf("export async function soloClientas"));
  assert.match(fn, /!isAdmin\(e\)/, "tiene que excluir también al CEO");
  assert.match(fn, /equipo\.has\(e\)/);
});
