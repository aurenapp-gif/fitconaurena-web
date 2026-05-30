import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { sbInsert, sbUpload, safePath } from "@/lib/supabase";

export const runtime = "nodejs";

async function uploadPhoto(form: FormData, field: string): Promise<string | null> {
  const f = form.get(field);
  if (f instanceof File && f.size > 0) {
    const path = safePath(`${field}-${f.name || "foto"}`);
    await sbUpload("checkins", path, await f.arrayBuffer(), f.type || "image/jpeg");
    return path;
  }
  return null;
}

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

  if (weight !== null && (Number.isNaN(weight) || weight <= 0 || weight > 500)) {
    return NextResponse.json({ error: "Peso no válido." }, { status: 400 });
  }

  const hasPhoto = ["photo_front", "photo_side", "photo_back"].some((k) => {
    const f = form.get(k);
    return f instanceof File && f.size > 0;
  });
  if (weight === null && !note && !hasPhoto) {
    return NextResponse.json({ error: "Añade al menos peso, nota o foto." }, { status: 400 });
  }

  try {
    const [photo_front, photo_side, photo_back] = await Promise.all([
      uploadPhoto(form, "photo_front"),
      uploadPhoto(form, "photo_side"),
      uploadPhoto(form, "photo_back"),
    ]);
    await sbInsert("check_ins", {
      member_email: email,
      weight,
      note: note || null,
      photo_front,
      photo_side,
      photo_back,
    });
  } catch (err) {
    console.error("[api/miembros/checkin] error", err);
    return NextResponse.json({ error: "No se pudo guardar el check-in." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
