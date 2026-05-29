import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, isAdmin } from "@/lib/members";
import { plusOneMonthISO } from "@/lib/profile";
import { sbSelect, sbUpsert } from "@/lib/supabase";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
}

/** En la primera entrada de una clienta, fija su renovación a +1 mes. */
async function ensureRenewal(email: string) {
  try {
    const rows = await sbSelect<{ renewal_date: string | null }>(
      "profiles",
      `select=renewal_date&email=eq.${encodeURIComponent(email)}`
    );
    if (!rows[0] || !rows[0].renewal_date) {
      await sbUpsert("profiles", {
        email,
        renewal_date: plusOneMonthISO(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("[verificar] ensureRenewal", e);
  }
}

export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const token = req.nextUrl.searchParams.get("token") ?? undefined;
  const email = verifyMagicToken(token);

  if (!email) {
    return NextResponse.redirect(`${origin}/miembros/acceso?error=1`);
  }

  // Clientas (no admin): asegurar fecha de renovación desde su primera entrada.
  if (!isAdmin(email)) await ensureRenewal(email);

  const res = NextResponse.redirect(`${origin}/miembros`);
  res.cookies.set(SESSION_COOKIE, createSessionToken(email), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
