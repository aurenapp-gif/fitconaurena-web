import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { createToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/mailer";
import { recordPendingLead } from "@/lib/leads";

// Use the Node runtime — the token module relies on the `crypto` HMAC API.
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

  try {
    const token = createToken(email);
    const verifyUrl = `${siteOrigin(req)}/verificar?token=${encodeURIComponent(token)}`;

    await recordPendingLead(email);
    await sendVerificationEmail(email, verifyUrl);
  } catch (err) {
    console.error("[api/lead] failed to process lead", err);
    return NextResponse.json(
      { error: "No hemos podido enviar el email. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  // Always return the same success response regardless of whether the address
  // already existed — avoids leaking which emails are registered.
  return NextResponse.json({ ok: true });
}
