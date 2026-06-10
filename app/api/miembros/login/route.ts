import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isMember, createMagicToken } from "@/lib/members";
import { sendMagicLink } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";
import { sbUpsert } from "@/lib/supabase";
import { siteOrigin, clientIp, sameOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!rateLimit(`member-login:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Introduce un email válido." }, { status: 400 });
  }

  // Solo enviamos el enlace si es miembro. Respondemos igual en ambos casos
  // para no revelar quién es miembro.
  try {
    if (await isMember(email)) {
      const token = createMagicToken(email);
      const url = `${siteOrigin(req)}/api/miembros/verificar?token=${encodeURIComponent(token)}`;
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await sbUpsert("login_codes", {
        email,
        code,
        attempts: 0,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
      await sendMagicLink(email, url, code);
    }
  } catch (err) {
    console.error("[api/miembros/login] error", err);
    // No revelamos el detalle; respondemos ok igualmente.
  }

  return NextResponse.json({ ok: true });
}
