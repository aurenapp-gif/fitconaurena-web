import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";
import { addSubscriber } from "@/lib/mailerlite";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = verifyToken(token);

  if (!result.ok) {
    // Enlace no válido o caducado → a /gracias con aviso de error.
    return NextResponse.redirect(`${origin}/gracias?error=${result.reason}`);
  }

  // El usuario ha confirmado: lo damos de alta como confirmado en MailerLite.
  // Si MailerLite fallara, igualmente le damos acceso (el token es válido) y
  // dejamos traza para reintentar.
  const sub = await addSubscriber(result.email);
  if (!sub.ok) {
    console.error(`[api/confirm] MailerLite error ${sub.status}: ${sub.message}`);
  }

  return NextResponse.redirect(`${origin}/gracias`);
}
