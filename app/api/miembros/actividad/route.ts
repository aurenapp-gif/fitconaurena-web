import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { logActivity, isAction } from "@/lib/activity";

export const runtime = "nodejs";

/** Registra una acción de la clienta (abrir o descargar un documento).
 * La acción se valida contra una lista cerrada y siempre se guarda con el email
 * de la sesión: nadie puede escribir en el historial de otra persona. */
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ ok: false }, { status: 403 });
  // La actividad de la coach no interesa: el registro documenta el uso de la clienta.
  if (isAdmin(email)) return NextResponse.json({ ok: true });

  let data: { action?: unknown; detail?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!isAction(data.action)) return NextResponse.json({ ok: false }, { status: 400 });

  await logActivity(email, data.action, typeof data.detail === "string" ? data.detail : undefined);
  return NextResponse.json({ ok: true });
}
