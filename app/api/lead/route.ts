import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { createToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/mailer";

// El token usa la API crypto de Node.
export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
}

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

  // Doble opt-in propio: enviamos un email de verificación con un enlace
  // firmado. Solo damos de alta en MailerLite cuando el usuario confirme.
  try {
    const token = createToken(email);
    const confirmUrl = `${siteOrigin(req)}/api/confirm?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(email, confirmUrl);
  } catch (err) {
    console.error("[api/lead] no se pudo enviar el email de verificación", err);
    return NextResponse.json(
      { error: "No hemos podido enviar el email. Inténtalo de nuevo en un momento." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
