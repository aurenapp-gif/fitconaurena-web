import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { sbInsert, sbUpload, safePath } from "@/lib/supabase";

export const runtime = "nodejs";

// Cualquier miembro con sesión válida puede enviar su check-in.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const weightRaw = String(form.get("weight") ?? "").replace(",", ".").trim();
  const weight = weightRaw === "" ? null : Number(weightRaw);
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  const photo = form.get("photo");

  if (weight !== null && (Number.isNaN(weight) || weight <= 0 || weight > 500)) {
    return NextResponse.json({ error: "Peso no válido." }, { status: 400 });
  }
  if (weight === null && !note && !(photo instanceof File && photo.size > 0)) {
    return NextResponse.json({ error: "Añade al menos peso, nota o foto." }, { status: 400 });
  }

  try {
    let photo_path: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      photo_path = safePath(photo.name || "foto");
      await sbUpload("checkins", photo_path, await photo.arrayBuffer(), photo.type || "image/jpeg");
    }
    await sbInsert("check_ins", {
      member_email: email,
      weight,
      note: note || null,
      photo_path,
    });
  } catch (err) {
    console.error("[api/miembros/checkin] error", err);
    return NextResponse.json({ error: "No se pudo guardar el check-in." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
