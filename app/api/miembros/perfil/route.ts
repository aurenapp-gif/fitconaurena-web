import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sanitizeQuestionnaire } from "@/lib/profile";
import { sbUpsert } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { display_name?: unknown; questionnaire?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const display_name =
    typeof body.display_name === "string" ? body.display_name.trim().slice(0, 60) : "";
  const questionnaire = sanitizeQuestionnaire(body.questionnaire);

  try {
    await sbUpsert("profiles", {
      email,
      display_name: display_name || email.split("@")[0],
      questionnaire,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/miembros/perfil]", err);
    return NextResponse.json({ error: "No se pudo guardar el perfil." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
