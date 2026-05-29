import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { addSubscriber } from "@/lib/mailerlite";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const rawEmail = (body as { email?: unknown })?.email;
  if (typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Falta el email." }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Introduce un email válido." }, { status: 400 });
  }

  // Hand the subscriber to MailerLite. With double opt-in enabled, MailerLite
  // sends the confirmation email; we never send anything ourselves.
  const result = await addSubscriber(email);

  if (!result.ok) {
    console.error(`[api/lead] MailerLite error ${result.status}: ${result.message}`);
    return NextResponse.json(
      { error: "No hemos podido procesar tu suscripción. Inténtalo de nuevo en un momento." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
