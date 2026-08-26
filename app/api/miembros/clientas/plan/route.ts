import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbUpsert, sbSelect, sbDelete, sbDeleteObject } from "@/lib/supabase";
import { plusOneMonthISO } from "@/lib/profile";
import { sendPlanUpdateEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";
import { verifyPath } from "@/lib/token";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  // El archivo YA está en Storage: aquí solo se registra. Antes llegaba dentro
  // de la petición, y cualquier plan de más de 4,5 MB se quedaba por el camino
  // (tope de las funciones de Vercel) con un críptico «Error de conexión».
  let body: { member?: unknown; type?: unknown; title?: unknown; note?: unknown; path?: unknown; pathToken?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const member = normalizeEmail(typeof body.member === "string" ? body.member : "");
  const type = typeof body.type === "string" ? body.type : "";
  const title = (typeof body.title === "string" ? body.title : "").trim().slice(0, 120);
  const note = (typeof body.note === "string" ? body.note : "").trim().slice(0, 1000);
  const path = typeof body.path === "string" ? body.path : "";
  const pathToken = typeof body.pathToken === "string" ? body.pathToken : "";

  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });
  if (type !== "nutricion" && type !== "entrenamiento")
    return NextResponse.json({ error: "Tipo no válido." }, { status: 400 });
  // La ruta tiene que ser una emitida por /sign: si no, cualquiera con sesión de
  // coach podría registrar como plan un archivo arbitrario del almacenamiento.
  if (!path || !verifyPath(path, pathToken)) {
    return NextResponse.json({ error: "La subida no es válida. Vuelve a intentarlo." }, { status: 400 });
  }

  const kind = type === "nutricion" ? "nutrición" : "entrenamiento";

  try {
    const row = { member_email: member, type, title: title || null, file_path: path };
    try {
      await sbInsert("plans", { ...row, note: note || null });
    } catch (e) {
      // Si la columna `note` todavía no existe (falta ejecutar la migración
      // supabase/plan-comentario.sql), no bloqueamos la subida: el plan se
      // guarda igual, solo sin el comentario.
      console.error("[clientas/plan] insert con note falló; reintento sin comentario", e);
      await sbInsert("plans", row);
    }
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
