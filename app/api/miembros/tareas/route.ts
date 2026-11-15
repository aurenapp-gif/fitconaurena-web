import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbUpdate, sbSelect } from "@/lib/supabase";
import { MAX_TAREAS, MAX_TITULO, MAX_DETALLE } from "@/lib/tareas";

export const runtime = "nodejs";

/**
 * Crear, editar, ordenar y retirar tareas del equipo. SOLO la coach.
 *
 * Marcarlas hechas es otra ruta (`/hecho`): eso sí lo hace el equipo, y
 * separarlo evita que un fallo al abrir esta deje a nadie sin poder marcar.
 */
async function soloCeo(req: NextRequest): Promise<string | null> {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return me && isAdmin(me) ? me : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const me = await soloCeo(req);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let b: { titulo?: unknown; detalle?: unknown; asignado_a?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const titulo = typeof b.titulo === "string" ? b.titulo.trim().slice(0, MAX_TITULO) : "";
  if (!titulo) return NextResponse.json({ error: "Escribe qué hay que hacer." }, { status: 400 });
  const detalle = typeof b.detalle === "string" ? b.detalle.trim().slice(0, MAX_DETALLE) : "";

  // Vacío = para todo el equipo. Un correo escrito a medias sí es un error:
  // dejaría la tarea asignada a alguien que no existe y no la vería nadie.
  let asignado: string | null = null;
  if (typeof b.asignado_a === "string" && b.asignado_a.trim()) {
    asignado = normalizeEmail(b.asignado_a);
    if (!isValidEmail(asignado)) return NextResponse.json({ error: "Esa persona no vale." }, { status: 400 });
  }

  try {
    const hay = await sbSelect<{ id: string; prioridad: number }>("staff_tasks", "select=id,prioridad&activa=is.true");
    if (hay.length >= MAX_TAREAS) {
      return NextResponse.json({ error: `Ya hay ${MAX_TAREAS} tareas. Retira alguna antes de añadir otra.` }, { status: 400 });
    }
    // La nueva va al final: quien la escribe decide después si sube.
    const prioridad = hay.reduce((max, t) => Math.max(max, t.prioridad), 0) + 10;
    await sbInsert("staff_tasks", {
      titulo, detalle: detalle || null, asignado_a: asignado, prioridad, created_by: me,
    });
  } catch (err) {
    console.error("[tareas] crear", err);
    return NextResponse.json({ error: "No se pudo guardar la tarea." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Editar el texto, a quién le toca, o moverla de sitio. */
export async function PATCH(req: NextRequest) {
  const me = await soloCeo(req);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let b: { id?: unknown; titulo?: unknown; detalle?: unknown; asignado_a?: unknown; mover?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof b.id === "string" ? b.id.trim() : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Tarea no válida." }, { status: 400 });

  /*
   * Subir o bajar una tarea. Se INTERCAMBIAN las prioridades con la vecina en
   * vez de renumerar la lista entera: así dos cambios a la vez no se pisan, y
   * si uno falla la lista no se queda a medio ordenar.
   */
  if (b.mover === "sube" || b.mover === "baja") {
    try {
      const todas = (await sbSelect<{ id: string; prioridad: number; created_at: string }>(
        "staff_tasks", "select=id,prioridad,created_at&activa=is.true"
      )).sort((x, y) => x.prioridad - y.prioridad || x.created_at.localeCompare(y.created_at));
      const i = todas.findIndex((t) => t.id === id);
      if (i < 0) return NextResponse.json({ error: "Esa tarea ya no está." }, { status: 404 });
      const j = b.mover === "sube" ? i - 1 : i + 1;
      if (j < 0 || j >= todas.length) return NextResponse.json({ ok: true, sinCambios: true });
      // Si empatan, no basta con intercambiar: se les dan huecos distintos.
      const pa = todas[i].prioridad, pb = todas[j].prioridad;
      const [nueva, vecina] = pa === pb ? (b.mover === "sube" ? [pa - 1, pb] : [pa + 1, pb]) : [pb, pa];
      await sbUpdate("staff_tasks", `id=eq.${id}`, { prioridad: nueva });
      await sbUpdate("staff_tasks", `id=eq.${todas[j].id}`, { prioridad: vecina });
    } catch (err) {
      console.error("[tareas] mover", err);
      return NextResponse.json({ error: "No se pudo mover." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  if (typeof b.titulo === "string") {
    const t = b.titulo.trim().slice(0, MAX_TITULO);
    if (!t) return NextResponse.json({ error: "Escribe qué hay que hacer." }, { status: 400 });
    patch.titulo = t;
  }
  if (typeof b.detalle === "string") patch.detalle = b.detalle.trim().slice(0, MAX_DETALLE) || null;
  if (typeof b.asignado_a === "string") {
    const a = b.asignado_a.trim();
    if (!a) patch.asignado_a = null;
    else {
      const e = normalizeEmail(a);
      if (!isValidEmail(e)) return NextResponse.json({ error: "Esa persona no vale." }, { status: 400 });
      patch.asignado_a = e;
    }
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que cambiar." }, { status: 400 });

  try {
    await sbUpdate("staff_tasks", `id=eq.${id}`, patch);
  } catch (err) {
    console.error("[tareas] editar", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Retirar una tarea. No la borra: la marca inactiva, para no llevarse por
 * delante el registro de quién la hizo y cuándo.
 */
export async function DELETE(req: NextRequest) {
  const me = await soloCeo(req);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
  if (!UUID.test(id)) return NextResponse.json({ error: "Tarea no válida." }, { status: 400 });
  try {
    await sbUpdate("staff_tasks", `id=eq.${id}`, { activa: false });
  } catch (err) {
    console.error("[tareas] retirar", err);
    return NextResponse.json({ error: "No se pudo retirar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
