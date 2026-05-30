import { NextRequest, NextResponse } from "next/server";
import { getMembers, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbUpsert } from "@/lib/supabase";
import { sendCallReminder, sendCheckinReminder, sendPlanUpdateEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 60;

function madridDay(): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(new Date());
}
function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
// Hora local de Madrid (0–23) de una fecha dada.
function madridHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "numeric", hourCycle: "h23" }).format(d));
}
// Horas "activas" (08:00–24:00 en Madrid) transcurridas entre start y now.
// La franja de madrugada (00:00–08:00) no cuenta. Tope en 24 (basta para todos
// los umbrales) para no iterar de más.
function activeHoursBetween(start: Date, now: Date): number {
  const rawH = (now.getTime() - start.getTime()) / 3600000;
  if (rawH <= 0) return 0;
  if (rawH >= 72) return 24;
  let active = 0;
  for (let t = start.getTime(); t < now.getTime() && active < 24; t += 3600000) {
    if (madridHour(new Date(t)) >= 8) active++;
  }
  return active;
}

export async function GET(req: NextRequest) {
  // Solo quien tenga el secreto (Vercel Cron / GitHub Actions). Si no está
  // configurado, bloqueamos por seguridad en vez de dejar el endpoint abierto.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Modo prueba: ?test=correo@ejemplo.com envía los DOS emails de muestra solo a
  // esa dirección, sin tocar la base de datos ni al resto de clientas.
  const testTo = req.nextUrl.searchParams.get("test");
  if (testTo) {
    const to = normalizeEmail(testTo);
    if (!isValidEmail(to)) return NextResponse.json({ error: "Email de prueba no válido." }, { status: 400 });
    const result: Record<string, string> = {};
    try { await sendCallReminder(to); result.call = "enviado"; } catch (e) { result.call = `error: ${String(e)}`; }
    try { await sendCheckinReminder(to); result.checkin = "enviado"; } catch (e) { result.checkin = `error: ${String(e)}`; }
    return NextResponse.json({ ok: true, test: to, result });
  }

  const members = (await getMembers()).filter((m) => !isAdmin(m.email));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  let callSent = 0;
  let checkinSent = 0;

  // 1) Recordatorio de videollamada los jueves (idempotente: si el cron se
  //    dispara dos veces el mismo día, no reenvía gracias a last_call_reminder).
  if (madridDay() === "Thu") {
    let callMap = new Map<string, string | null>();
    try {
      const profs = await sbSelect<{ email: string; last_call_reminder: string | null }>("profiles", "select=email,last_call_reminder");
      callMap = new Map(profs.map((p) => [p.email, p.last_call_reminder]));
    } catch (e) { console.error("[cron] call map", e); }

    for (const m of members) {
      if (callMap.get(m.email) === today) continue; // ya avisada hoy
      try {
        await sendCallReminder(m.email);
        sendPushToEmail(m.email, {
          title: "Hoy toca videollamada 📞",
          body: "No olvides tu sesión de seguimiento con Aurena.",
          url: "/miembros/agenda",
        }).catch((e) => console.error("[cron] push call", e));
        await sbUpsert("profiles", { email: m.email, last_call_reminder: today, updated_at: new Date().toISOString() });
        callSent++;
      } catch (e) { console.error("[cron] call", m.email, e); }
    }
  }

  // 2) Recordatorio de revisión cada ~15 días (si no ha hecho check-in ni se le
  //    ha recordado en los últimos 15 días).
  try {
    const since = isoDaysAgo(15);
    const recent = new Set(
      (await sbSelect<{ member_email: string }>("check_ins", `select=member_email&created_at=gte.${since}`)).map((r) => r.member_email)
    );
    const profs = await sbSelect<{ email: string; last_checkin_reminder: string | null }>("profiles", "select=email,last_checkin_reminder");
    const remMap = new Map(profs.map((p) => [p.email, p.last_checkin_reminder]));

    for (const m of members) {
      if (recent.has(m.email)) continue; // hizo check-in hace poco
      const lastRem = remMap.get(m.email);
      if (lastRem && lastRem >= since) continue; // ya se le recordó hace <15d
      try {
        await sendCheckinReminder(m.email);
        sendPushToEmail(m.email, {
          title: "Toca check-in 📲",
          body: "Cuéntale a Aurena cómo te ha ido esta semana.",
          url: "/miembros/checkins",
        }).catch((e) => console.error("[cron] push checkin", e));
        await sbUpsert("profiles", { email: m.email, last_checkin_reminder: today, updated_at: new Date().toISOString() });
        checkinSent++;
      } catch (e) { console.error("[cron] checkin", m.email, e); }
    }
  } catch (e) {
    console.error("[cron] checkin reminders", e);
  }

  // 3) Secuencia de avisos del plan tras completar el cuestionario (email).
  //    Idempotente vía profiles.plan_notice_stage (0 → 6 → 8 → 24). Se detiene si
  //    la clienta ya tiene plan subido. Solo cuenta horas activas (08:00–24:00) y
  //    nunca se envía de madrugada (en horario de Madrid).
  let planSeqSent = 0;
  const activeNow = madridHour(new Date()) >= 8; // no enviar entre 00:00 y 08:00 (Madrid)
  if (activeNow) try {
    type P = { email: string; questionnaire_completed_at: string | null; plan_notice_stage: number | null };
    const profs = await sbSelect<P>("profiles", "select=email,questionnaire_completed_at,plan_notice_stage");
    const planMembers = new Set(
      (await sbSelect<{ member_email: string }>("plans", "select=member_email")).map((r) => r.member_email)
    );
    const memberSet = new Set(members.map((m) => m.email));
    const STAGES: { h: number; stage: number; subject: string; heading: string; message: string }[] = [
      { h: 24, stage: 24, subject: "Tu plan estará listo en breve ⏳", heading: "Tu plan estará listo en breve ⏳", message: "Estamos rematando los últimos detalles para que sea perfecto para ti." },
      { h: 8, stage: 8, subject: "Tu plan se está elaborando ✍️", heading: "Tu plan se está elaborando ✍️", message: "Tu coach ya le está dando forma a tu plan personalizado." },
      { h: 6, stage: 6, subject: "Preparando tu plan 💪", heading: "Preparando tu plan 💪", message: "Tu coach está preparando toda tu información para crear tu plan." },
    ];

    for (const p of profs) {
      if (!p.questionnaire_completed_at) continue;
      if (!memberSet.has(p.email)) continue; // solo clientas activas
      if (planMembers.has(p.email)) continue; // ya tiene plan → sin avisos de espera
      const stage = p.plan_notice_stage ?? 0;
      const hours = activeHoursBetween(new Date(p.questionnaire_completed_at), new Date());
      const next = STAGES.find((s) => hours >= s.h && stage < s.stage); // umbral de horas activas alcanzado
      if (!next) continue;
      try {
        await sendPlanUpdateEmail(p.email, { subject: next.subject, heading: next.heading, message: next.message });
        await sbUpsert("profiles", { email: p.email, plan_notice_stage: next.stage, updated_at: new Date().toISOString() });
        planSeqSent++;
      } catch (e) { console.error("[cron] plan seq", p.email, e); }
    }
  } catch (e) {
    console.error("[cron] plan sequence", e);
  }

  return NextResponse.json({ ok: true, callSent, checkinSent, planSeqSent });
}
