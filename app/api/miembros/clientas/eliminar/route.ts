import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";

// Quita a una clienta del grupo "Miembros" → pierde el acceso (en próximos logins).
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  if (isAdmin(email)) return NextResponse.json({ error: "No puedes eliminarte a ti misma." }, { status: 400 });

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_MEMBERS_GROUP_ID;
  if (!apiKey || !groupId) return NextResponse.json({ error: "Config incompleta." }, { status: 500 });
  const H = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

  try {
    const sub = await fetch(`https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`, { headers: H });
    if (!sub.ok) return NextResponse.json({ ok: true }); // no existe → nada que hacer
    const id = (await sub.json())?.data?.id;
    if (id) {
      await fetch(`https://connect.mailerlite.com/api/subscribers/${id}/groups/${groupId}`, { method: "DELETE", headers: H });
    }
  } catch (err) {
    console.error("[clientas/eliminar]", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
