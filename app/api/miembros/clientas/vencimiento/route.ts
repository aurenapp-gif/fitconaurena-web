import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbUpsert, isMissingTable } from "@/lib/supabase";
import { isValidDateISO } from "@/lib/profile";

export const runtime = "nodejs";

/**
 * Corrige a mano el vencimiento del servicio de una clienta. Normalmente se
 * pone solo al darla de alta (doce meses); esto es para los casos con otra
 * duración pactada y para ponérselo a las clientas antiguas.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { member?: unknown; date?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const member = typeof body.member === "string" ? normalizeEmail(body.member) : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });
  if (date && !isValidDateISO(date)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });

  try {
    await sbUpsert("profiles", { email: member, service_ends_at: date || null, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("[clientas/vencimiento]", err);
    if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la columna.", setup: true }, { status: 400 });
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
