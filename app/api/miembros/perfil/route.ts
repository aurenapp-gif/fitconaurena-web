import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sanitizeQuestionnaire } from "@/lib/profile";
import { sbUpsert, sbSelect } from "@/lib/supabase";

export const runtime = "nodejs";

// Campos mínimos para considerar el cuestionario "completo" (dispara la
// secuencia de avisos del plan, una sola vez).
const REQUIRED = ["edad", "altura", "peso_actual", "peso_objetivo", "objetivo"];

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

  // Si el cuestionario queda completo y aún no se había marcado, guardamos la
  // fecha (una sola vez) para arrancar la secuencia de avisos del plan.
  const complete = REQUIRED.every((k) => (questionnaire[k] ?? "").toString().trim() !== "");
  let questionnaire_completed_at: string | undefined;
  if (complete) {
    try {
      const rows = await sbSelect<{ questionnaire_completed_at: string | null }>(
        "profiles",
        `select=questionnaire_completed_at&email=eq.${encodeURIComponent(email)}`
      );
      if (!rows[0]?.questionnaire_completed_at) questionnaire_completed_at = new Date().toISOString();
    } catch (e) {
      console.error("[api/miembros/perfil] check completed", e);
    }
  }

  try {
    await sbUpsert("profiles", {
      email,
      display_name: display_name || email.split("@")[0],
      questionnaire,
      ...(questionnaire_completed_at ? { questionnaire_completed_at } : {}),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/miembros/perfil]", err);
    return NextResponse.json({ error: "No se pudo guardar el perfil." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
