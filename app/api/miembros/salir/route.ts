import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/members";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(`${siteOrigin(req)}/miembros/acceso`);
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
