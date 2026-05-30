import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, createMagicToken } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sendWelcomeEmail } from "@/lib/mailer";
import { sbUpsert } from "@/lib/supabase";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";
const WELCOME_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_MEMBERS_GROUP_ID;
  if (!apiKey || !groupId) return NextResponse.json({ error: "Config incompleta." }, { status: 500 });

  // 1) Alta como miembro activa en MailerLite (consentimiento: la coach la da de alta).
  try {
    const fields: Record<string, string> = {};
    if (name) fields.name = name;
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, status: "active", groups: [groupId], ...(name ? { fields } : {}) }),
    });
    if (!res.ok) {
      console.error("[alta] mailerlite", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "No se pudo dar de alta en MailerLite." }, { status: 502 });
    }
  } catch (err) {
    console.error("[alta] mailerlite", err);
    return NextResponse.json({ error: "No se pudo dar de alta." }, { status: 502 });
  }

  // Reactiva el acceso por si estaba revocada de antes.
  await sbUpsert("profiles", { email, access_revoked: false, updated_at: new Date().toISOString() }).catch(() => {});

  // 2) Email de bienvenida con acceso directo (enlace válido 7 días).
  try {
    const token = createMagicToken(email, WELCOME_TTL);
    const url = `${siteOrigin(req)}/api/miembros/verificar?token=${encodeURIComponent(token)}`;
    await sendWelcomeEmail(email, url);
  } catch (err) {
    console.error("[alta] welcome email", err);
    // El alta sí se hizo; avisamos de que el email falló.
    return NextResponse.json({ ok: true, warning: "Alta hecha, pero el email de bienvenida falló." });
  }

  return NextResponse.json({ ok: true });
}
