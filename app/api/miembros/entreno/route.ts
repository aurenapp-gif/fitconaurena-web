import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { rateLimit } from "@/lib/ratelimit";
import { sbDelete, sbInsert, sbSelect, sbUpdate, sbUpsert } from "@/lib/supabase";
import { pesoValido, repsValidas, serieValida } from "@/lib/entrenos";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sesiones abiertas por clienta y hora. De sobra: no se entrena diez veces. */
const LIMITE_SESIONES = 10;
/** Series por hora. Una sesión larga son unas 25; se deja margen de sobra. */
const LIMITE_SERIES = 300;

/**
 * Que esa sesión sea SUYA.
 *
 * Se comprueba en cada escritura, con el correo de la cookie. No basta con que
 * el id exista: sin esto, cualquiera con sesión iniciada podría mandar series
 * al entreno de otra clienta poniendo un id que no es el suyo.
 */
async function sesionDe(id: string, email: string) {
  if (!UUID.test(id)) return null;
  const filas = await sbSelect<{ id: string; started_at: string; finished_at: string | null; dia: string | null }>(
    "workout_sessions",
    `select=id,started_at,finished_at,dia&id=eq.${id}&member_email=eq.${encodeURIComponent(email)}&limit=1`
  ).catch(() => []);
  return filas[0] ?? null;
}

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const accion = typeof body.accion === "string" ? body.accion : "";

  // ---- Empezar un entreno -------------------------------------------------
  if (accion === "empezar") {
    if (!rateLimit(`entreno:sesion:${email}`, LIMITE_SESIONES, 3600_000)) {
      return NextResponse.json({ error: "Has empezado muchos entrenos seguidos. Prueba dentro de un rato." }, { status: 429 });
    }
    const dia = typeof body.dia === "string" ? body.dia.trim().slice(0, 80) : "";
    const planId = typeof body.plan === "string" && UUID.test(body.plan) ? body.plan : null;
    try {
      const fila = await sbInsert<{ id: string; started_at: string }>("workout_sessions", {
        member_email: email,
        plan_id: planId,
        dia: dia || null,
      });
      return NextResponse.json({ sesion: fila.id, desde: fila.started_at });
    } catch (e) {
      console.error("[entreno] empezar", e);
      return NextResponse.json({ error: "No se ha podido empezar el entreno." }, { status: 500 });
    }
  }

  // ---- Apuntar una serie --------------------------------------------------
  if (accion === "serie") {
    if (!rateLimit(`entreno:serie:${email}`, LIMITE_SERIES, 3600_000)) {
      return NextResponse.json({ error: "Demasiados envíos seguidos." }, { status: 429 });
    }
    const id = typeof body.sesion === "string" ? body.sesion : "";
    const sesion = await sesionDe(id, email);
    if (!sesion) return NextResponse.json({ error: "Ese entreno no es tuyo." }, { status: 403 });
    if (sesion.finished_at) return NextResponse.json({ error: "Ese entreno ya está terminado." }, { status: 409 });

    const ejercicio = typeof body.ejercicio === "string" ? body.ejercicio.trim().slice(0, 120) : "";
    const serie = serieValida(body.serie);
    if (!ejercicio || serie === null) {
      return NextResponse.json({ error: "Falta el ejercicio o la serie." }, { status: 400 });
    }
    // Un peso o unas repeticiones fuera de rango NO se guardan como null, que
    // se leería igual que «no lo apuntó»: se avisa, porque casi siempre es un
    // dedazo y ella quiere corregirlo.
    if (body.peso !== null && body.peso !== undefined && body.peso !== "" && pesoValido(body.peso) === null) {
      return NextResponse.json({ error: "Ese peso no se puede guardar. Revísalo." }, { status: 400 });
    }
    if (body.reps !== null && body.reps !== undefined && body.reps !== "" && repsValidas(body.reps) === null) {
      return NextResponse.json({ error: "Esas repeticiones no se pueden guardar. Revísalas." }, { status: 400 });
    }
    const orden = Number.isInteger(Number(body.orden)) ? Math.max(0, Math.min(99, Number(body.orden))) : null;

    try {
      // Reenviar la misma serie la corrige, no la duplica: la clave única es
      // (sesión, ejercicio, serie).
      await sbUpsert("workout_sets", {
        session_id: sesion.id,
        member_email: email,
        ejercicio,
        orden,
        serie,
        peso: pesoValido(body.peso),
        reps: repsValidas(body.reps),
      }, "session_id,ejercicio,serie");
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[entreno] serie", e);
      return NextResponse.json({ error: "No se ha podido guardar la serie." }, { status: 500 });
    }
  }

  // ---- Borrar una serie apuntada por error --------------------------------
  if (accion === "quitar-serie") {
    const id = typeof body.sesion === "string" ? body.sesion : "";
    const sesion = await sesionDe(id, email);
    if (!sesion) return NextResponse.json({ error: "Ese entreno no es tuyo." }, { status: 403 });
    const ejercicio = typeof body.ejercicio === "string" ? body.ejercicio.trim().slice(0, 120) : "";
    const serie = serieValida(body.serie);
    if (!ejercicio || serie === null) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    try {
      await sbDelete(
        "workout_sets",
        `session_id=eq.${sesion.id}&member_email=eq.${encodeURIComponent(email)}&ejercicio=eq.${encodeURIComponent(ejercicio)}&serie=eq.${serie}`
      );
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[entreno] quitar-serie", e);
      return NextResponse.json({ error: "No se ha podido quitar." }, { status: 500 });
    }
  }

  // ---- Terminar -----------------------------------------------------------
  if (accion === "terminar") {
    const id = typeof body.sesion === "string" ? body.sesion : "";
    const sesion = await sesionDe(id, email);
    if (!sesion) return NextResponse.json({ error: "Ese entreno no es tuyo." }, { status: 403 });
    if (sesion.finished_at) return NextResponse.json({ ok: true, fin: sesion.finished_at });
    const fin = new Date().toISOString();
    try {
      await sbUpdate("workout_sessions", `id=eq.${sesion.id}&member_email=eq.${encodeURIComponent(email)}`, { finished_at: fin });
      return NextResponse.json({ ok: true, fin });
    } catch (e) {
      console.error("[entreno] terminar", e);
      return NextResponse.json({ error: "No se ha podido cerrar el entreno." }, { status: 500 });
    }
  }

  // ---- Tirar un entreno que se abrió sin querer ---------------------------
  if (accion === "descartar") {
    const id = typeof body.sesion === "string" ? body.sesion : "";
    const sesion = await sesionDe(id, email);
    if (!sesion) return NextResponse.json({ error: "Ese entreno no es tuyo." }, { status: 403 });
    try {
      // Las series se van con la sesión (on delete cascade).
      await sbDelete("workout_sessions", `id=eq.${sesion.id}&member_email=eq.${encodeURIComponent(email)}`);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[entreno] descartar", e);
      return NextResponse.json({ error: "No se ha podido descartar." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
