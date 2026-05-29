import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, isAdmin } from "@/lib/members";
import { plusOneMonthISO } from "@/lib/profile";
import { sbSelect, sbDelete, sbUpsert } from "@/lib/supabase";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  if (!rateLimit(`member-code:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  let body: { email?: unknown; code?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!isValidEmail(email) || code.length !== 6) {
    return NextResponse.json({ error: "Email o código no válidos." }, { status: 400 });
  }

  try {
    const rows = await sbSelect<{ code: string; expires_at: string }>(
      "login_codes",
      `select=code,expires_at&email=eq.${encodeURIComponent(email)}`
    );
    const row = rows[0];
    if (!row || row.code !== code || new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Código incorrecto o caducado." }, { status: 401 });
    }
    // Código de un solo uso.
    await sbDelete("login_codes", `email=eq.${encodeURIComponent(email)}`).catch(() => {});
    // Renovación en primera entrada (clientas).
    if (!isAdmin(email)) {
      const p = await sbSelect<{ renewal_date: string | null }>("profiles", `select=renewal_date&email=eq.${encodeURIComponent(email)}`).catch(() => []);
      if (!p[0] || !p[0].renewal_date) {
        await sbUpsert("profiles", { email, renewal_date: plusOneMonthISO(), updated_at: new Date().toISOString() }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[api/miembros/codigo]", err);
    return NextResponse.json({ error: "No se pudo verificar el código." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(email), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE,
  });
  return res;
}
