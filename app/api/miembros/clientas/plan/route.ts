import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbUpload, sbUpsert, safePath } from "@/lib/supabase";
import { plusOneMonthISO } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const member = normalizeEmail(String(form.get("member") ?? ""));
  const type = String(form.get("type") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const file = form.get("file");

  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });
  if (type !== "nutricion" && type !== "entrenamiento")
    return NextResponse.json({ error: "Tipo no válido." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "Adjunta el archivo del plan." }, { status: 400 });

  try {
    const path = safePath(`${type}-${file.name || "plan"}`);
    await sbUpload("planes", path, await file.arrayBuffer(), file.type || "application/octet-stream");
    await sbInsert("plans", { member_email: member, type, title: title || null, file_path: path });
    // Renovar el plan reinicia el ciclo: próxima renovación a +1 mes.
    await sbUpsert("profiles", { email: member, renewal_date: plusOneMonthISO(), updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("[clientas/plan]", err);
    return NextResponse.json({ error: "No se pudo subir el plan." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
