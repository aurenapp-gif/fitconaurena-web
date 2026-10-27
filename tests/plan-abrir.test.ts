/**
 * Abrir el plan sin que el enlace caduque.
 *
 * El enlace firmado de Supabase dura una hora. La app se instala en el móvil y
 * la pantalla se queda abierta días: al volver a ella, «Abrir mi plan» llevaba
 * a un error de Supabase que, desde el lado de la clienta, era «no me deja ver
 * mi planificación». Esto lo sujetan pruebas porque se rompe en silencio: el
 * enlace funciona perfectamente durante la primera hora.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const ruta = leer("app/api/miembros/plan/[id]/route.ts");

test("el enlace que ve la clienta no lleva una firma caducable", () => {
  const perfil = leer("app/miembros/perfil/page.tsx");
  assert.match(perfil, /url: `\/api\/miembros\/plan\/\$\{p\.id\}`/);
});

test("se firma al pulsarlo, no al pintar la página", () => {
  assert.match(ruta, /url = await sbSignedUrl\("planes", plan\.file_path, 3600\)/);
  assert.match(ruta, /NextResponse\.redirect\(descarga/);
});

test("sin sesión lleva a la pantalla de acceso, no a un error de Supabase", () => {
  assert.match(ruta, /if \(!me\) return NextResponse\.redirect\(`\$\{siteOrigin\(req\)\}\/miembros\/acceso`\)/);
});

test("nunca deja abrir el plan de otra clienta", () => {
  assert.match(ruta, /const suyo = plan\.member_email\.toLowerCase\(\) === me\.toLowerCase\(\)/);
  assert.match(ruta, /if \(!suyo && !\(await puedeGestionarClientas\(me\)\)\)/);
});

test("el identificador se comprueba antes de ir a la base", () => {
  assert.match(ruta, /\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(id\)/);
});

test("solo cuenta como uso cuando lo abre ella", () => {
  // Que la coach mire el plan no puede figurar como que lo usó la clienta:
  // ese registro se usa para acreditar el servicio prestado.
  assert.match(ruta, /if \(suyo\) \{[\s\S]{0,260}logActivity/);
});
