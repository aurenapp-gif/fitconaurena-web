import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbUpsert, sbUpload, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { TERMS_VERSION } from "@/lib/terms";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Completa el alta de la clienta: identidad, dirección, foto y aceptación.
 *
 * La aceptación se guarda con su momento exacto, la versión del texto que se
 * le mostró y los datos identificativos y postales, para poder acreditar
 * después qué aceptó, cuándo y quién exactamente (necesario si hay que
 * emprender acciones legales por deuda según el apartado 8 de los Términos).
 */
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const fullName = String(form.get("full_name") ?? "").trim().slice(0, 120);
  const address = String(form.get("address") ?? "").trim().slice(0, 200);
  const postalCode = String(form.get("postal_code") ?? "").trim().slice(0, 12);
  const accepted = form.get("accepted") === "true";
  const photo = form.get("photo");

  if (!name) return NextResponse.json({ error: "Escribe cómo quieres que te llame." }, { status: 400 });
  if (fullName.split(/\s+/).length < 2) {
    return NextResponse.json({ error: "Escribe tu nombre y apellidos completos." }, { status: 400 });
  }
  if (address.length < 5) return NextResponse.json({ error: "Escribe tu dirección de residencia." }, { status: 400 });
  if (!postalCode) return NextResponse.json({ error: "Escribe tu código postal." }, { status: 400 });
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Sube tu foto de perfil." }, { status: 400 });
  }
  const invalid = validateUpload(photo, "image");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  // Sin aceptación no se guarda nada: la casilla debe marcarla la clienta.
  if (!accepted) return NextResponse.json({ error: "Debes aceptar las condiciones para continuar." }, { status: 400 });

  const now = new Date().toISOString();
  const base = {
    email,
    display_name: name,
    photo_path: "", // se rellena tras subir
    terms_accepted_at: now,
    terms_version: TERMS_VERSION,
    onboarding_completed_at: now,
    updated_at: now,
  };
  const extra = { full_name: fullName, address, postal_code: postalCode };

  try {
    const path = safePath(photo.name || "foto");
    await sbUpload("perfil", path, await photo.arrayBuffer(), photo.type || "image/jpeg");
    base.photo_path = path;
    try {
      // Intento primero con los datos nuevos (nombre completo + dirección).
      await sbUpsert("profiles", { ...base, ...extra });
    } catch (e) {
      // Degradación segura: si las columnas nuevas aún no existen, guardamos
      // al menos lo básico para no bloquear la bienvenida.
      console.error("[bienvenida] upsert con datos nuevos falló, reintento sin ellos", e);
      await sbUpsert("profiles", base);
    }
  } catch (err) {
    console.error("[bienvenida]", err);
    return NextResponse.json({ error: "No se pudo guardar. Inténtalo de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
