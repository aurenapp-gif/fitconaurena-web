import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sendCheckinReminder } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import { sbSelect } from "@/lib/supabase";
import { periodoDe, todayMadrid } from "@/lib/revisiones";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Recordar la revisión a quien no la ha subido. Coach y equipo.
 *
 * Se manda a quien se pide, pero el servidor comprueba ANTES que de verdad le
 * falta: si entre que la pantalla se cargó y la coach pulsó el botón la clienta
 * ha subido su revisión, no se le manda nada. Recordarle algo que acaba de
 * hacer es la forma más rápida de que deje de leer los avisos.
 *
 * Body: { emails: string[] }  — vacío, todas las que falten.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !(await puedeGestionarClientas(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: { emails?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const pedidos = Array.isArray(body.emails)
    ? body.emails.filter((x): x is string => typeof x === "string").map(normalizeEmail).filter(isValidEmail)
    : [];
  if (pedidos.length === 0) return NextResponse.json({ error: "No has elegido a nadie." }, { status: 400 });
  if (pedidos.length > 100) return NextResponse.json({ error: "Demasiadas a la vez." }, { status: 400 });

  const periodo = periodoDe(todayMadrid());

  // Quién ha subido ya la de esta quincena. Se vuelve a mirar aquí a propósito.
  let yaEstan = new Set<string>();
  try {
    const hechas = await sbSelect<{ member_email: string }>(
      "check_ins", `select=member_email&created_at=gte.${periodo.inicio}T00:00:00`
    );
    yaEstan = new Set(hechas.map((h) => h.member_email));
  } catch (e) {
    console.error("[recordar] comprobando", e);
    return NextResponse.json({ error: "No se pudo comprobar quién la ha subido." }, { status: 502 });
  }

  const destino = pedidos.filter((e) => !yaEstan.has(e));
  const yaLaSubieron = pedidos.length - destino.length;

  let enviados = 0;
  const fallidos: string[] = [];
  for (const email of destino) {
    try {
      await sendCheckinReminder(email);
      enviados++;
      // El push no bloquea: si no tiene notificaciones puestas, el correo ya salió.
      sendPushToEmail(email, {
        title: "Toca tu revisión 📸",
        body: `Tu revisión del ${periodo.etiqueta} todavía está sin subir.`,
        url: "/miembros/checkins",
      }).catch(() => {});
      logActivity(email, "recordatorio_revision", periodo.etiqueta).catch(() => {});
    } catch (err) {
      console.error("[recordar]", email, err);
      fallidos.push(email);
    }
  }

  return NextResponse.json({ ok: true, enviados, yaLaSubieron, fallidos });
}
