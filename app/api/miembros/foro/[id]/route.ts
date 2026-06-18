import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/supabase";
import { displayName, type Question, type Reply } from "@/lib/forum";

export const runtime = "nodejs";

const UUID = /^[0-9a-fA-F-]{36}$/;

// Pregunta + su hilo de respuestas.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  try {
    const [qs, replies] = await Promise.all([
      sbSelect<Question>("forum_questions", `select=*&id=eq.${params.id}`),
      sbSelect<Reply>("forum_replies", `select=*&question_id=eq.${params.id}&order=created_at.asc`),
    ]);
    const question = qs[0];
    if (!question) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, question, replies });
  } catch (e) {
    console.error("[foro/[id] GET]", e);
    return NextResponse.json({ error: "Error al cargar." }, { status: 500 });
  }
}

// Añadir una respuesta al hilo.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  let body: { body?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!text) return NextResponse.json({ error: "Escribe una respuesta." }, { status: 400 });

  let name = displayName(null, email);
  try {
    const prof = await sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(email)}`);
    name = displayName(prof[0]?.display_name, email);
  } catch { /* fallback */ }

  try {
    await sbInsert("forum_replies", { question_id: params.id, author_email: email, author_name: name, body: text });
    // Sube la pregunta arriba (actividad reciente).
    await sbUpdate("forum_questions", `id=eq.${params.id}`, { last_activity: new Date().toISOString() });
  } catch (e) {
    console.error("[foro/[id] POST]", e);
    return NextResponse.json({ error: "No se pudo responder." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Marcar resuelta / fijada (solo coach).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  let body: { resolved?: unknown; pinned?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const patch: Record<string, boolean> = {};
  if (typeof body.resolved === "boolean") patch.resolved = body.resolved;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que cambiar." }, { status: 400 });

  try {
    await sbUpdate("forum_questions", `id=eq.${params.id}`, patch);
  } catch (e) {
    console.error("[foro/[id] PATCH]", e);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Borrar la pregunta (cascada de respuestas) o una respuesta concreta (?reply=). Solo coach.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  const reply = req.nextUrl.searchParams.get("reply");
  try {
    if (reply) {
      if (!UUID.test(reply)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });
      await sbDelete("forum_replies", `id=eq.${reply}`);
    } else {
      await sbDelete("forum_questions", `id=eq.${params.id}`);
    }
  } catch (e) {
    console.error("[foro/[id] DELETE]", e);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
