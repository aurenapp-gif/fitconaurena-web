import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbDelete, isMissingTable } from "@/lib/supabase";
import { safeLink, MAX_TITLE, MAX_NOTE } from "@/lib/llamadas";
import { isValidDateISO } from "@/lib/profile";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guarda el enlace de la llamada estratégica de una clienta. Solo la coach. */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { member?: unknown; url?: unknown; title?: unknown; date?: unknown; note?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const member = typeof data.member === "string" ? normalizeEmail(data.member) : "";
  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });

  const url = safeLink(data.url);
  if (!url) return NextResponse.json({ error: "Pega un enlace que empiece por https://" }, { status: 400 });

  const title = typeof data.title === "string" ? data.title.trim().slice(0, MAX_TITLE) : "";
  const note = typeof data.note === "string" ? data.note.trim().slice(0, MAX_NOTE) : "";
  const date = typeof data.date === "string" ? data.date.trim() : "";
  if (date && !isValidDateISO(date)) {
    return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });
  }

  try {
    await sbInsert("member_calls", {
      member_email: member,
      url,
      title: title || null,
      call_date: date || null,
      note: note || null,
      created_by: me,
    });
  } catch (err) {
    console.error("[clientas/llamadas] alta", err);
    // La tabla todavía no existe: es un paso de configuración de la coach, no
    // un error de la app. Se le devuelve marcado para poder enseñarle el SQL.
    if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la tabla.", setup: true }, { status: 400 });
    return NextResponse.json({ error: "No se pudo guardar la llamada." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Borra una llamada (se pegó mal el enlace, se repitió…). Solo la coach. */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { id?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Llamada no válida." }, { status: 400 });

  try {
    await sbDelete("member_calls", `id=eq.${id}`);
  } catch (err) {
    console.error("[clientas/llamadas] borrar", err);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
