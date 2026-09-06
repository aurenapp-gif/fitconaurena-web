import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbUpdate } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Ajustes personales de la clienta. De momento uno: no enseñarle su peso.
 *
 * El peso se sigue guardando y la coach lo sigue viendo; solo deja de
 * aparecer en las pantallas de ella. Para muchas mujeres la báscula es una
 * relación difícil y no tiene por qué ser lo primero que vean.
 */
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { hide_weight?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (typeof body.hide_weight !== "boolean") {
    return NextResponse.json({ error: "Falta el ajuste." }, { status: 400 });
  }
  try {
    await sbUpdate("profiles", `email=eq.${encodeURIComponent(email)}`, { hide_weight: body.hide_weight });
  } catch (err) {
    console.error("[api/miembros/ajustes]", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hide_weight: body.hide_weight });
}
