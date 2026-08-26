import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSignedUploadUrl, safePath } from "@/lib/supabase";
import { signPath } from "@/lib/token";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Permiso para subir el plan DIRECTAMENTE a Storage, sin pasar por el servidor.
 *
 * POR QUÉ. Un plan puede pesar hasta 25 MB, pero las funciones de Vercel cortan
 * las peticiones a 4,5 MB. Un PDF más grande ni siquiera llegaba a ejecutarse:
 * la conexión se cortaba antes y en pantalla salía «Error de conexión», que
 * hacía pensar en un problema de internet cuando no lo era. Subiendo directo a
 * Storage ese techo desaparece.
 *
 * Es el mismo mecanismo que ya usaban los vídeos de técnica.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });
  // Cada permiso habilita subir un archivo. 40 por hora es de sobra para una
  // tanda de planes y acota el coste si la sesión se viera comprometida.
  if (!rateLimit(`plan-sign:${me}`, 40, 3600_000)) {
    return NextResponse.json({ error: "Demasiadas subidas seguidas. Prueba dentro de un rato." }, { status: 429 });
  }

  let body: { filename?: unknown; type?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const type = body.type === "entrenamiento" ? "entrenamiento" : "nutricion";
  const filename = typeof body.filename === "string" && body.filename ? body.filename : "plan.pdf";

  const path = safePath(`${type}-${filename}`);
  try {
    const { uploadUrl } = await sbSignedUploadUrl("planes", path);
    // La ruta va firmada: al registrar el plan se comprueba, de modo que el
    // navegador no puede colar una ruta que no haya emitido el servidor.
    return NextResponse.json({ uploadUrl, path, pathToken: signPath(path) });
  } catch (e) {
    console.error("[clientas/plan/sign]", e);
    return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });
  }
}
