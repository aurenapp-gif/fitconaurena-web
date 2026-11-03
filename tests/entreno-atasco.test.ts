/**
 * Que «Mi entreno» no se quede pillado.
 *
 * Lo que contó la clienta: «una vez terminado el entreno se queda el mismo y
 * no me deja acceder a otro». La causa era una sesión sin cerrar: dura ocho
 * horas, y mientras tanto escondía el selector de plan y el de día, y además
 * se imponía a lo que ella pidiera en la URL. Quien salía del gimnasio sin
 * pulsar «Terminar» se quedaba toda la tarde en el mismo entreno.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(import.meta.dirname ?? ".", "..", p), "utf8");
const entreno = leer("components/Entreno.tsx");
const pagina = leer("app/miembros/entreno/page.tsx");

test("el entreno a medias es de SU plan, no de la pantalla", () => {
  // Si no, al abrir otra fase parecía que esa estaba a medias y las series se
  // apuntaban contra la sesión equivocada.
  assert.match(pagina, /const suya = enMarcha && plan && \(enMarcha\.plan_id == null \|\| enMarcha\.plan_id === plan\.id\)/);
  assert.match(pagina, /ultimaVezPorEjercicio\(series, suya\?\.id \?\? null\)/);
  assert.match(pagina, /const deHoy = suya/);
  assert.match(pagina, /sesionAbierta=\{suya \?/);
});

test("el selector de plan ya no desaparece con un entreno en marcha", () => {
  const dia = entreno.slice(entreno.indexOf("// ---- El día ---"));
  assert.match(dia, /\n      <SelectorPlan planes=\{planes\} actual=\{planId\} \/>/);
  assert.doesNotMatch(dia, /\{!sesion && <SelectorPlan/);
});

test("ni los botones de día", () => {
  const dia = entreno.slice(entreno.indexOf("// ---- El día ---"));
  assert.match(dia, /\{dias\.length > 1 && \(/);
  assert.doesNotMatch(dia, /dias\.length > 1 && !sesion/);
});

test("el selector no se queda muerto si el plan no llega a cambiar", () => {
  // Era el «pillado» literal: se apagaban TODOS los botones y, si la
  // navegación no cambiaba de plan, el componente no se re-montaba y no se
  // volvían a encender nunca.
  assert.match(entreno, /useEffect\(\(\) => \{ setYendo\(null\); \}, \[actual\]\);/);
  assert.match(entreno, /disabled=\{yendo === p\.id\}/);
  assert.doesNotMatch(entreno, /disabled=\{!!yendo\}/);
});

test("un ejercicio se puede abrir aunque no haya entreno empezado", () => {
  // Antes se tocaba y no pasaba nada, sin decir por qué.
  assert.doesNotMatch(entreno, /type="button" disabled=\{!sesion\} onClick=\{\(\) => setAbierto\(i\)\}/);
});

test("y dentro ofrece empezar, en vez de casillas que no guardan", () => {
  const vista = entreno.slice(entreno.indexOf("function VistaEjercicio("));
  assert.match(vista, /Empieza el entreno para ir apuntando tus pesos/);
  assert.match(vista, /onClick=\{empezar\}/);
});

test("al terminar hay salida que no sea volver al inicio", () => {
  assert.match(entreno, /Entrenar otra cosa/);
  assert.match(entreno, /setTerminado\(null\); setSesion\(null\); setDesde\(null\); setApuntadas\(\[\]\); router\.refresh\(\);/);
});

test("si el entreno a medias está en otra fase, se dice y se puede volver", () => {
  assert.match(entreno, /Tienes un entreno a medias en/);
  assert.match(entreno, /href=\{`\/miembros\/entreno\?plan=\$\{otroEntreno\.id\}`\}/);
});

test("descartar ya no se calla los fallos", () => {
  // Se limpiaba la pantalla, el refresco traía la sesión de vuelta y parecía
  // que el botón no hacía nada.
  assert.doesNotMatch(entreno, /accion: "descartar", sesion \}\)\.catch\(\(\) => \{\}\)/);
  assert.match(entreno, /No se ha podido descartar\./);
});

test("el plan que mira se recuerda, entre también desde «Mi plan»", () => {
  // El selector ya guardaba su elección, pero entrar con ?plan= no tocaba la
  // cookie: al volver desde el inicio le salía otra vez el de antes.
  assert.match(entreno, /useEffect\(\(\) => \{\n    if \(!planId\) return;/);
  assert.match(entreno, /\$\{COOKIE_PLAN_ENTRENO\}=\$\{planId\}/);
});

/* --- Lo mismo en el resto de lo que abre la clienta: nada que ella pulse
       puede depender de un enlace firmado que caduca en una hora. --- */

test("la corrección de la coach se abre por una ruta que no caduca", () => {
  // El navegador pide el audio al dar al PLAY, no al pintar la pantalla
  // (preload="none"), así que una pantalla abierta un rato la dejaba muda.
  const tecnica = leer("app/miembros/tecnica/page.tsx");
  assert.match(tecnica, /videoUrl: r\.video_path \? `\/api\/miembros\/tecnica\/\$\{r\.id\}`/);
  assert.match(tecnica, /replyUrl: r\.coach_reply_path \? `\/api\/miembros\/tecnica\/\$\{r\.id\}\?de=respuesta`/);
  assert.doesNotMatch(tecnica, /sbSignedUrl\("tecnica"/);
});

test("y la ruta solo deja ver lo suyo", () => {
  const ruta = leer("app/api/miembros/tecnica/[id]/route.ts");
  assert.match(ruta, /fila\.member_email\.toLowerCase\(\) !== me\.toLowerCase\(\) && !\(await puedeGestionarClientas\(me\)\)/);
  assert.match(ruta, /status: 403/);
});

test("su contrato firmado tampoco se enlaza firmado", () => {
  const perfil = leer("app/miembros/perfil/page.tsx");
  assert.match(perfil, /url: `\/api\/miembros\/contrato\/firmado\/\$\{s\.id\}`/);
  assert.doesNotMatch(perfil, /sbSignedUrl\(CONTRACT_BUCKET/);
  const ruta = leer("app/api/miembros/contrato/firmado/[id]/route.ts");
  assert.match(ruta, /fila\.member_email\.toLowerCase\(\) !== me\.toLowerCase\(\)/);
});

test("sus fotos de revisión tampoco caducan a la hora", () => {
  // Las miniaturas son loading="lazy" (se piden al bajar) y la grande solo al
  // tocarla, así que con enlaces de una hora la pantalla se quedaba en blanco.
  const checkins = leer("app/miembros/checkins/page.tsx");
  assert.match(checkins, /url: `\/api\/miembros\/checkin\/foto\/\$\{r\.id\}\?cual=\$\{cual\}`/);
  assert.match(checkins, /thumb: `\/api\/miembros\/checkin\/foto\/\$\{r\.id\}\?cual=\$\{cual\}&w=500`/);
  assert.match(checkins, /const fotoDe = \(r: CheckIn \| undefined, cual: string, w: number\)/);
  const ruta = leer("app/api/miembros/checkin/foto/[id]/route.ts");
  assert.match(ruta, /fila\.member_email\.toLowerCase\(\) !== me\.toLowerCase\(\)/);
  assert.match(ruta, /status: 403/);
});

test("se miran TODAS las sesiones abiertas, no solo la última", () => {
  // Desde que puede cambiar de plan a media sesión puede tener una abierta en
  // cada fase. Con limit=1 solo se veía la última y lo apuntado en la otra
  // parecía haberse perdido al volver a ella.
  assert.match(pagina, /finished_at=is\.null&order=started_at\.desc&limit=\$\{MAX_PLANES_ENTRENO\}/);
  assert.match(pagina, /const frescas = abiertas\.filter/);
  assert.match(pagina, /const enMarcha = \(elegido && frescas\.find\(\(a\) => a\.plan_id === elegido\.id\)\) \|\| frescas\[0\] \|\| null;/);
});

test("la comparativa «antes y ahora» tampoco se enlaza firmada", () => {
  // La foto grande se pide al TOCAR la miniatura, que es justo cuando el
  // enlace firmado ya estaba muerto. Es la de la ficha del coach.
  const checkins = leer("app/miembros/checkins/page.tsx");
  assert.match(checkins, /`\/api\/miembros\/checkin\/foto\/\$\{t\.revision\}\?cual=\$\{par\.id\}/);
  assert.doesNotMatch(checkins, /sbSignedUrl|sbSignedThumb/);
  // El id del ángulo es el mismo nombre que acepta la ruta.
  const lib = leer("lib/comparativa-fotos.ts");
  assert.match(lib, /\{ id: "frente", nombre: "Frente", campo: "photo_front" \}/);
  assert.match(lib, /revision: r\.id,/);
});
