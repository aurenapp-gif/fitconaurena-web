import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/members";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(`${siteOrigin(req)}/miembros/acceso`);
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
