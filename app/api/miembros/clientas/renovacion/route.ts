import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbUpsert } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { member?: unknown; date?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const member = typeof body.member === "string" ? normalizeEmail(body.member) : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });

  try {
    await sbUpsert("profiles", { email: member, renewal_date: date || null, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("[clientas/renovacion]", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
