import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbUpdate } from "@/lib/supabase";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Activa o retira la EXENCIÓN de firma de contrato de una clienta. Solo la coach.
 *
 * Las clientas que ya estaban dentro antes de implantar la firma obligatoria
 * quedaron exentas: entran a su área privada sin firmar nada. Este endpoint
 * permite exigirles el contrato más adelante (por ejemplo, al renovar con las
 * condiciones nuevas) o volver a eximirlas.
 *
 * Body: { memberEmail, exempt: boolean }
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { memberEmail?: string; exempt?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const memberEmail = normalizeEmail(body.memberEmail ?? "");
  if (!isValidEmail(memberEmail)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  if (typeof body.exempt !== "boolean") return NextResponse.json({ error: "Falta el valor." }, { status: 400 });

  try {
    await sbUpdate("profiles", `email=eq.${encodeURIComponent(memberEmail)}`, { contracts_exempt: body.exempt });
  } catch (err) {
    console.error("[contrato/exencion]", err);
    return NextResponse.json({ error: "No se pudo guardar. ¿Has ejecutado la migración de exención?" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
