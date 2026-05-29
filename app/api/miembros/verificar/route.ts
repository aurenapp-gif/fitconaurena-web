import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/members";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const token = req.nextUrl.searchParams.get("token") ?? undefined;
  const email = verifyMagicToken(token);

  if (!email) {
    return NextResponse.redirect(`${origin}/miembros/acceso?error=1`);
  }

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
