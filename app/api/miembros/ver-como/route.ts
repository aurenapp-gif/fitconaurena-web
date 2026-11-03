import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, VISTA_COOKIE, VISTA_MAX_AGE, createVistaToken, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

/**
 * Encender y apagar «ver la app como ella».
 *
 * Solo la coach (ADMIN_EMAILS), no el equipo: un entrenador ya ve los datos de
 * sus clientas en la ficha, y ponerse en su lugar es otra cosa.
 *
 * Queda registrado quién lo enciende y sobre quién. Mirar la pantalla de otra
 * persona no debería poder hacerse sin dejar rastro.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  if (isAdmin(email)) return NextResponse.json({ error: "Esa es tu propia cuenta." }, { status: 400 });

  logActivity(me, "ver_como", email).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(VISTA_COOKIE, createVistaToken(email), {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: VISTA_MAX_AGE,
  });
  return res;
}

/**
 * Salir. Es un GET porque el aviso para salir tiene que funcionar desde
 * cualquier pantalla, también desde una a la que la app te haya llevado sola.
 */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(`${siteOrigin(req)}/miembros/clientas`);
  res.cookies.set(VISTA_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
  return res;
}
