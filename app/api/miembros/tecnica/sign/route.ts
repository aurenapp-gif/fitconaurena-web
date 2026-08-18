import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSignedUploadUrl, safePath } from "@/lib/supabase";
import { signPath } from "@/lib/token";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Devuelve una URL firmada para subir el vídeo DIRECTAMENTE a Storage.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Acceso no disponible." }, { status: 403 });
  // Cada permiso emitido habilita subir un vídeo (hasta 100 MB) directamente a
  // Storage. 15 por hora cubre de sobra el uso real y acota el coste.
  if (!rateLimit(`tecnica-sign:${email}`, 15, 3600_000)) {
    return NextResponse.json({ error: "Demasiadas subidas seguidas. Prueba dentro de un rato." }, { status: 429 });
  }

  let body: { filename?: unknown; kind?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const filename = typeof body.filename === "string" && body.filename ? body.filename : "video.mp4";
  // "reply" = vídeo de respuesta de la coach (solo admin).
  const kind = body.kind === "reply" ? "reply" : "video";
  if (kind === "reply" && !isAdmin(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const path = (kind === "reply" ? "respuestas/" : "") + safePath(filename);
  try {
    const { uploadUrl } = await sbSignedUploadUrl("tecnica", path);
    // pathToken ata esta ruta a una emisión del servidor: al registrar el vídeo
    // se valida, así el cliente no puede inyectar una ruta arbitraria.
    return NextResponse.json({ uploadUrl, path, pathToken: signPath(path) });
  } catch (e) {
    console.error("[tecnica/sign]", e);
    return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });
  }
}
