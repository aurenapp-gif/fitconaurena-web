import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbUpsert, sbUpload, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { TERMS_VERSION } from "@/lib/terms";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Completa el alta de la clienta: nombre, foto y aceptación de las condiciones.
 *
 * La aceptación se guarda con su momento exacto y la versión del texto que se
 * le mostró, que es lo que permite acreditar después qué aceptó y cuándo.
 */
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const accepted = form.get("accepted") === "true";
  const photo = form.get("photo");

  if (!name) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Sube tu foto de perfil." }, { status: 400 });
  }
  const invalid = validateUpload(photo, "image");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  // Sin aceptación no se guarda nada: la casilla debe marcarla la clienta.
  if (!accepted) return NextResponse.json({ error: "Debes aceptar las condiciones para continuar." }, { status: 400 });

  const now = new Date().toISOString();
  try {
    const path = safePath(photo.name || "foto");
    await sbUpload("perfil", path, await photo.arrayBuffer(), photo.type || "image/jpeg");
    await sbUpsert("profiles", {
      email,
      display_name: name,
      photo_path: path,
      terms_accepted_at: now,
      terms_version: TERMS_VERSION,
      onboarding_completed_at: now,
      updated_at: now,
    });
  } catch (err) {
    console.error("[bienvenida]", err);
    return NextResponse.json({ error: "No se pudo guardar. Inténtalo de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
