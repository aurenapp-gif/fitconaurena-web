import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isQualified, answersToText, QUESTIONS, type Answers } from "@/lib/application";
import { sendApplicationNotification } from "@/lib/mailer";
import { addApplicant } from "@/lib/mailerlite";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, sameOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

const GROUP_QUALIFIED = process.env.MAILERLITE_GROUP_QUALIFIED ?? "188815102565156064";
const GROUP_UNQUALIFIED = process.env.MAILERLITE_GROUP_UNQUALIFIED ?? "188815103197447348";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL ?? "aurenapp@gmail.com";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!rateLimit(`aplicar:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429 }
    );
  }

  let body: {
    nombre?: unknown;
    email?: unknown;
    telefono?: unknown;
    answers?: unknown;
    motivacion?: unknown;
    website?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Honeypot
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, qualified: false });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.trim() : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const motivacion = typeof body.motivacion === "string" ? body.motivacion.trim().slice(0, 2000) : "";
  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Answers;

  if (!nombre || nombre.length > 100) {
    return NextResponse.json({ error: "Introduce tu nombre." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Introduce un email válido." }, { status: 400 });
  }
  if (!telefono || telefono.length > 40) {
    return NextResponse.json({ error: "Introduce tu teléfono o WhatsApp." }, { status: 400 });
  }
  // Todas las preguntas respondidas con un valor válido.
  const allAnswered = QUESTIONS.every((q) =>
    q.options.some((o) => o.value === answers[q.id])
  );
  if (!allAnswered) {
    return NextResponse.json({ error: "Responde todas las preguntas." }, { status: 400 });
  }

  const qualified = isQualified(answers);

  // 1) Notificar al equipo (clave: así sabemos si califica). 2) Guardar en MailerLite.
  let notified = false;
  let stored = false;
  try {
    await sendApplicationNotification({
      to: NOTIFY_EMAIL,
      nombre,
      email,
      telefono,
      qualified,
      answersText: answersToText(answers),
      motivacion,
    });
    notified = true;
  } catch (err) {
    console.error("[api/aplicar] fallo al notificar", err);
  }
  try {
    const r = await addApplicant({
      email,
      name: nombre,
      phone: telefono,
      groupId: qualified ? GROUP_QUALIFIED : GROUP_UNQUALIFIED,
    });
    stored = r.ok;
    if (!r.ok) console.error(`[api/aplicar] MailerLite ${r.status}: ${r.message}`);
  } catch (err) {
    console.error("[api/aplicar] fallo al guardar en MailerLite", err);
  }

  if (!notified && !stored) {
    return NextResponse.json(
      { error: "No hemos podido enviar tu solicitud. Inténtalo de nuevo." },
      { status: 502 }
    );
  }

  // 3) (Opcional) Volcar la fila completa a Google Sheets vía webhook de Apps
  // Script. Solo se ejecuta si SHEETS_WEBHOOK_URL está configurada.
  const sheetsUrl = process.env.SHEETS_WEBHOOK_URL;
  if (sheetsUrl) {
    const row: Record<string, string> = {
      fecha: new Date().toISOString(),
      nombre,
      email,
      telefono,
      califica: qualified ? "SÍ" : "NO",
      motivacion,
    };
    for (const q of QUESTIONS) {
      const opt = q.options.find((o) => o.value === answers[q.id]);
      row[q.id] = opt ? opt.label : "";
    }
    try {
      await fetch(sheetsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
    } catch (err) {
      console.error("[api/aplicar] fallo al volcar a Google Sheets", err);
    }
  }

  return NextResponse.json({ ok: true, qualified });
}
