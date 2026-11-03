/**
 * «Ver la app como ella»: mirar las pantallas de una clienta con sus datos.
 *
 * Dos propiedades que no se pueden perder:
 *  1. Solo mira quien ya puede ver esos datos (la coach), y queda registrado.
 *  2. Mirar NO es ser ella: lo que se pulse se guarda a nombre de quien mira.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createVistaToken, verifyVistaToken, verifySession, createSessionToken } from "../lib/members";

const raiz = join(import.meta.dirname ?? ".", "..");
const leer = (p: string) => readFileSync(join(raiz, p), "utf8");

test("el testigo de mirar no sirve como sesión, ni al revés", () => {
  // Si se pudieran confundir, una cookie de mirar sería una sesión de ella.
  const vista = createVistaToken("clienta@ejemplo.com");
  assert.equal(verifyVistaToken(vista), "clienta@ejemplo.com");
  assert.equal(verifySession(vista), null);
  assert.equal(verifyVistaToken(createSessionToken("clienta@ejemplo.com")), null);
});

test("un testigo manipulado no vale", () => {
  const vista = createVistaToken("clienta@ejemplo.com");
  const [cuerpo, firma] = vista.split(".");
  const otro = Buffer.from(JSON.stringify({ email: "otra@ejemplo.com", typ: "vista", exp: Date.now() + 60000 }))
    .toString("base64url");
  assert.equal(verifyVistaToken(`${otro}.${firma}`), null);
  assert.equal(verifyVistaToken(`${cuerpo}.${"a".repeat(firma.length)}`), null);
});

test("mirar solo vale si la sesión real es de la coach", () => {
  const guard = leer("lib/guard.ts");
  assert.match(guard, /if \(!real \|\| !isAdmin\(real\)\) return null;/);
  // Y no se puede «mirarse a una misma»: eso dejaría el aviso puesto sin motivo.
  assert.match(guard, /mirando\.toLowerCase\(\) === real\.toLowerCase\(\)/);
});

test("encenderlo es solo de la coach y queda apuntado", () => {
  const ruta = leer("app/api/miembros/ver-como/route.ts");
  assert.match(ruta, /if \(!me \|\| !isAdmin\(me\)\) return NextResponse\.json\(\{ error: "No autorizado\." \}, \{ status: 403 \}\);/);
  assert.match(ruta, /logActivity\(me, "ver_como", email\)/);
  assert.match(ruta, /httpOnly: true, sameSite: "lax", secure: true/);
});

test("y el navegador no puede falsificar ese apunte", () => {
  assert.match(leer("lib/activity.ts"), /"ver_como",\n\]\);/);
});

test("MIRAR NO ES SER ELLA: ninguna ruta de API pasa por la suplantación", () => {
  // Esta es la propiedad que lo hace seguro. Las PANTALLAS usan requireMember
  // —que es donde se cambia a quién se mira— y las rutas que GUARDAN usan
  // verifySession, que lee la sesión real. Si una ruta usara requireMember,
  // lo que pulsara la coach se guardaría a nombre de la clienta.
  const apis: string[] = [];
  const recorrer = (d: string) => {
    for (const e of readdirSync(join(raiz, d), { withFileTypes: true })) {
      if (e.isDirectory()) recorrer(join(d, e.name));
      else if (e.name === "route.ts") apis.push(join(d, e.name));
    }
  };
  recorrer("app/api");
  assert.ok(apis.length > 20, `pocas rutas encontradas: ${apis.length}`);
  const culpables = apis.filter((f) => /\brequireMember\b|\bvistaComo\b/.test(leer(f)));
  assert.deepEqual(culpables, [], `estas rutas guardarían a nombre de la clienta: ${culpables.join(", ")}`);
});

test("el aviso sale siempre y se puede salir desde cualquier pantalla", () => {
  const layout = leer("app/miembros/layout.tsx");
  assert.match(layout, /Estás viendo la app como/);
  assert.match(layout, /Lo que pulses se guarda a tu nombre, no al suyo\./);
  // Enlace normal, no un botón: tiene que funcionar también donde no hay js
  // en marcha o adonde la app te haya llevado sola.
  assert.match(layout, /<a href="\/api\/miembros\/ver-como"/);
});
