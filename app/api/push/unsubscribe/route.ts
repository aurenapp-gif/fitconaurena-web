import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { sbDelete } from "@/lib/supabase";

export const runtime = "nodejs";

// Elimina la suscripción push de un dispositivo.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { endpoint?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return NextResponse.json({ error: "Falta endpoint." }, { status: 400 });

  try {
    await sbDelete("push_subscriptions", `endpoint=eq.${encodeURIComponent(endpoint)}`);
  } catch (err) {
    console.error("[push/unsubscribe]", err);
    return NextResponse.json({ error: "No se pudo desactivar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
