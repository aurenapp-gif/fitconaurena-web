import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sanitizeQuestionnaire, questionnaireComplete, errorNacimiento } from "@/lib/profile";
import { sbUpsert, sbSelect } from "@/lib/supabase";
import { adminEmails } from "@/lib/members";
import { sendPushToEmail } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { display_name?: unknown; questionnaire?: unknown; submitted?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const display_name =
    typeof body.display_name === "string" ? body.display_name.trim().slice(0, 60) : "";
  const questionnaire = sanitizeQuestionnaire(body.questionnaire);
  const submitted = body.submitted === true;

  // La fecha de nacimiento también se comprueba aquí, no solo en el formulario:
  // de ella sale la edad que ve la coach, y un dato inventado se leería como
  // bueno. Vacía se admite (el cuestionario se puede guardar a medias).
  const errFecha = errorNacimiento(questionnaire.fecha_nacimiento);
  if (errFecha) return NextResponse.json({ error: errFecha }, { status: 400 });

  // El ciclo de avisos del plan SOLO arranca cuando la clienta pulsa
  // "Enviar cuestionario" (submitted: true) y está completo. Guardar sin enviar
  // no lo activa. Se marca una sola vez (no se reinicia en envíos posteriores).
  // Lo que tenía guardado antes, para saber si de verdad ha cambiado algo y
  // si el cuestionario ya estaba enviado.
  let anterior: { questionnaire: unknown; questionnaire_completed_at: string | null } | null = null;
  try {
    const rows = await sbSelect<{ questionnaire: unknown; questionnaire_completed_at: string | null }>(
      "profiles",
      `select=questionnaire,questionnaire_completed_at&email=eq.${encodeURIComponent(email)}`
    );
    anterior = rows[0] ?? null;
  } catch (e) {
    console.error("[api/miembros/perfil] leer anterior", e);
  }

  let questionnaire_completed_at: string | undefined;
  if (submitted) {
    if (!questionnaireComplete(questionnaire)) {
      return NextResponse.json(
        { error: "Completa todos los campos obligatorios antes de enviar." },
        { status: 400 }
      );
    }
    if (!anterior?.questionnaire_completed_at) questionnaire_completed_at = new Date().toISOString();
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

  /*
   * Si CAMBIA algo de un cuestionario que ya estaba enviado, la coach se
   * entera. Es el caso de «se me olvidó decir que no como pescado»: el dato
   * llega semanas después de que nadie esté mirando ese formulario, y sin
   * aviso se queda escrito donde no lo lee nadie.
   *
   * No se avisa del primer envío (ahí ya hay su propio aviso), ni si no ha
   * cambiado nada, ni más de una vez por hora: mientras edita, guarda varias
   * veces seguidas.
   */
  const yaEstaba = !!anterior?.questionnaire_completed_at && !questionnaire_completed_at;
  const cambio = JSON.stringify(anterior?.questionnaire ?? {}) !== JSON.stringify(questionnaire);
  if (yaEstaba && cambio && rateLimit(`cuestionario-aviso:${email}`, 1, 3600_000)) {
    const quien = display_name || email;
    logActivity(email, "cuestionario_actualizado").catch(() => {});
    const coach = adminEmails()[0];
    if (coach) {
      sendPushToEmail(coach, {
        title: "Cuestionario actualizado",
        body: `${quien} ha cambiado algo en su cuestionario.`,
        url: `/miembros/clientas/${encodeURIComponent(email)}`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
