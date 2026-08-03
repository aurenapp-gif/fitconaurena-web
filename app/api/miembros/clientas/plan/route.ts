import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbUpload, sbUpsert, sbSelect, sbDelete, sbDeleteObject, safePath } from "@/lib/supabase";
import { plusOneMonthISO } from "@/lib/profile";
import { sendPlanUpdateEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";
import { validateUpload } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

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
  const invalid = validateUpload(file, "plan");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const kind = type === "nutricion" ? "nutrición" : "entrenamiento";

  try {
    const path = safePath(`${type}-${file.name || "plan"}`);
    await sbUpload("planes", path, await file.arrayBuffer(), file.type || "application/octet-stream");
    await sbInsert("plans", { member_email: member, type, title: title || null, file_path: path });
    // Renovar el plan reinicia el ciclo: próxima renovación a +1 mes. Además
    // detiene la secuencia de avisos de espera (plan_notice_stage=24).
    await sbUpsert("profiles", {
      email: member,
      renewal_date: plusOneMonthISO(),
      plan_notice_stage: 24,
      plan_ready_notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[clientas/plan]", err);
    return NextResponse.json({ error: "No se pudo subir el plan." }, { status: 500 });
  }

  // Aviso a la clienta en cuanto se sube el plan (no bloqueante: si falla el
  // envío, el plan ya está subido igualmente). Se avisa SIEMPRE, indicando de
  // qué plan se trata: si se suben nutrición y entrenamiento, llegan los dos
  // avisos y ella sabe exactamente qué hay nuevo.
  sendPlanUpdateEmail(member, {
    subject: `¡Tu plan de ${kind} ya está disponible! 🎉`,
    heading: "¡Tu plan ya está listo! 🎉",
    message: `Tu coach acaba de subir tu plan de ${kind}. Entra a tu área para verlo y empezar.`,
    cta: "Ver mi plan",
  }).catch((e) => console.error("[clientas/plan] email", e));

  sendPushToEmail(member, {
    title: "¡Tu plan ya está listo! 🎉",
    body: `Tu plan de ${kind} ya está en tu área privada.`,
    url: "/miembros/perfil",
  }).catch((e) => console.error("[clientas/plan] push", e));

  return NextResponse.json({ ok: true });
}

/** Borra un plan subido: primero la fila (deja de verlo la clienta al instante)
 * y después el archivo del bucket. No toca la fecha de renovación ni reactiva
 * los avisos de "estamos preparando tu plan": borrar un archivo mal subido no
 * debe disparar emails automáticos a la clienta. */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Plan no válido." }, { status: 400 });
  }

  try {
    const rows = await sbSelect<{ file_path: string | null }>("plans", `select=file_path&id=eq.${id}&limit=1`);
    if (rows.length === 0) return NextResponse.json({ error: "Ese plan ya no existe." }, { status: 404 });
    await sbDelete("plans", `id=eq.${id}`);
    if (rows[0].file_path) await sbDeleteObject("planes", rows[0].file_path);
  } catch (err) {
    console.error("[clientas/plan] delete", err);
    return NextResponse.json({ error: "No se pudo borrar el plan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
