import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { createToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";
import { siteOrigin, clientIp, sameOrigin } from "@/lib/routeUtils";

// El token usa la API crypto de Node.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  // Límite anti-abuso: máx. 5 envíos por IP cada 10 minutos.
  const ip = clientIp(req);
  if (!rateLimit(`lead:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Honeypot: campo oculto que un humano nunca rellena. Si viene con contenido,
  // es un bot: respondemos "ok" sin enviar nada.
  const honeypot = (body as { website?: unknown })?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ ok: true });
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
