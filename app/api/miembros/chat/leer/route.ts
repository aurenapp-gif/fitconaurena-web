import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbUpdate } from "@/lib/supabase";

export const runtime = "nodejs";

// Marca como leídos los mensajes del otro lado en un canal.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { member?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    if (isAdmin(email)) {
      const m = typeof body.member === "string" ? normalizeEmail(body.member) : "";
      if (!isValidEmail(m)) return NextResponse.json({ error: "Canal no válido." }, { status: 400 });
      await sbUpdate("messages", `member_email=eq.${encodeURIComponent(m)}&sender=eq.member&read_by_coach=eq.false`, {
        read_by_coach: true,
      });
    } else {
      await sbUpdate("messages", `member_email=eq.${encodeURIComponent(email)}&sender=eq.coach&read_by_member=eq.false`, {
        read_by_member: true,
      });
    }
  } catch (err) {
    console.error("[api/miembros/chat/leer]", err);
  }
  return NextResponse.json({ ok: true });
}
