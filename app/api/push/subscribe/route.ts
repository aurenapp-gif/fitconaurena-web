import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { sbInsertIgnore } from "@/lib/supabase";

export const runtime = "nodejs";

// Guarda la suscripción push del dispositivo de la clienta (o la coach).
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint.slice(0, 1000) : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh.slice(0, 300) : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth.slice(0, 300) : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Datos de suscripción incompletos." }, { status: 400 });
  }
  // El endpoint debe ser una URL https real (la del servicio de push del navegador).
  try {
    if (new URL(endpoint).protocol !== "https:") throw new Error("no https");
  } catch {
    return NextResponse.json({ error: "Suscripción no válida." }, { status: 400 });
  }

  try {
    // endpoint es PRIMARY KEY → ignore-duplicates hace que re-suscribirse no falle.
    await sbInsertIgnore("push_subscriptions", { endpoint, p256dh, auth, member_email: email });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json({ error: "No se pudo activar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
