import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbInsert, sbDelete } from "@/lib/supabase";
import type { Topic } from "@/lib/forum";

export const runtime = "nodejs";

// Lista de temáticas (cualquier miembro).
export async function GET(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  try {
    const topics = await sbSelect<Topic>("forum_topics", "select=id,name,position&order=position.asc,name.asc");
    return NextResponse.json({ ok: true, topics });
  } catch (e) {
    console.error("[foro/temas GET]", e);
    return NextResponse.json({ ok: true, topics: [] });
  }
}

// Crear temática (solo coach).
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { name?: unknown; position?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return NextResponse.json({ error: "Escribe un nombre." }, { status: 400 });
  const position = typeof body.position === "number" ? body.position : 0;

  try {
    await sbInsert("forum_topics", { name, position });
  } catch (e) {
    console.error("[foro/temas POST]", e);
    return NextResponse.json({ error: "No se pudo crear la temática." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Borrar temática (solo coach). Las preguntas quedan sin temática (no se borran).
export async function DELETE(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID no válido." }, { status: 400 });
  try {
    await sbDelete("forum_topics", `id=eq.${id}`);
  } catch (e) {
    console.error("[foro/temas DELETE]", e);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
