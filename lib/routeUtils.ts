import type { NextRequest } from "next/server";

/** Utilidades comunes de los route handlers (origen, IP, anti-CSRF básico). */

/** Origen del sitio para construir enlaces absolutos (verificación, magic-link). */
export function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
}

/** IP del cliente (mejor esfuerzo, tras proxies) para rate limiting. */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Acepta solo peticiones del propio sitio (mismo host). Si no hay cabecera
 *  Origin (algunos clientes no la envían) se permite y queda el rate limit. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
