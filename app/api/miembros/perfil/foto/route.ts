import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbUpsert, sbUpload, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });
  // Cambiar la foto es cosa de una vez cada mucho: 12 por hora sobra.
  if (!rateLimit(`foto:${email}`, 12, 3600_000)) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Prueba dentro de un rato." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Adjunta una imagen." }, { status: 400 });
  }
  const invalid = validateUpload(photo, "image");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const path = safePath(photo.name || "foto");
    await sbUpload("perfil", path, await photo.arrayBuffer(), photo.type || "image/jpeg");
    await sbUpsert("profiles", { email, photo_path: path, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("[api/miembros/perfil/foto]", err);
    return NextResponse.json({ error: "No se pudo subir la foto." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
