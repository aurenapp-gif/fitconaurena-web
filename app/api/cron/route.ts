import { NextRequest, NextResponse } from "next/server";
import { getMembers, isAdmin, adminEmails } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbUpsert, sbUpdate, sbDeleteObject } from "@/lib/supabase";
import { sendCallReminder, sendCheckinReminder, sendCheckinReport, sendEsperaTerminada, sendPlanUpdateEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";
import { periodoDe, tocaAvisar, tocaParteCoach, textoAviso } from "@/lib/revisiones";

export const runtime = "nodejs";
export const maxDuration = 60;

function madridDay(): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(new Date());
}
function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

// Avisos del plan por etapa (horas activas transcurridas). Ordenados de mayor a
// menor umbral: se envía el más alto alcanzado, uno cada vez.
const PLAN_STAGES: { h: number; stage: number; subject: string; heading: string; message: string }[] = [
  { h: 24, stage: 24, subject: "Tu plan estará listo en breve ⏳", heading: "Tu plan estará listo en breve ⏳", message: "Estamos rematando los últimos detalles para que sea perfecto para ti." },
  { h: 8, stage: 8, subject: "Tu plan se está elaborando ✍️", heading: "Tu plan se está elaborando ✍️", message: "Tu coach ya le está dando forma a tu plan personalizado." },
  { h: 6, stage: 6, subject: "Preparando tu plan 💪", heading: "Preparando tu plan 💪", message: "Tu coach está preparando toda tu información para crear tu plan." },
];
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

  // Modo prueba: ?test=correo@ejemplo.com envía TODOS los emails de muestra solo
  // a esa dirección, sin tocar la base de datos ni al resto de clientas. Incluye
  // los recordatorios y la secuencia completa de avisos del plan (6h/8h/24h +
  // "plan disponible"), tal cual los recibiría una clienta tras el cuestionario.
  const testTo = req.nextUrl.searchParams.get("test");
  if (testTo) {
    const to = normalizeEmail(testTo);
    if (!isValidEmail(to)) return NextResponse.json({ error: "Email de prueba no válido." }, { status: 400 });
    const result: Record<string, string> = {};
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const tryStep = async (key: string, fn: () => Promise<void>) => {
      try { await fn(); result[key] = "enviado"; } catch (e) { result[key] = `error: ${String(e)}`; }
      await sleep(350); // respeta el límite de Resend (5 emails/seg)
    };
    await tryStep("call", () => sendCallReminder(to));
    await tryStep("checkin", () => sendCheckinReminder(to));
    // Secuencia del plan (las mismas que envía el cron real):
    await tryStep("plan_6h", () => sendPlanUpdateEmail(to, {
      subject: "Preparando tu plan 💪", heading: "Preparando tu plan 💪",
      message: "Tu coach está preparando toda tu información para crear tu plan.",
    }));
    await tryStep("plan_8h", () => sendPlanUpdateEmail(to, {
      subject: "Tu plan se está elaborando ✍️", heading: "Tu plan se está elaborando ✍️",
      message: "Tu coach ya le está dando forma a tu plan personalizado.",
    }));
    await tryStep("plan_24h", () => sendPlanUpdateEmail(to, {
      subject: "Tu plan estará listo en breve ⏳", heading: "Tu plan estará listo en breve ⏳",
      message: "Estamos rematando los últimos detalles para que sea perfecto para ti.",
    }));
    await tryStep("plan_disponible", () => sendPlanUpdateEmail(to, {
      subject: "¡Tu plan ya está disponible! 🎉", heading: "¡Tu plan ya está listo! 🎉",
      message: "Tu coach ha subido tu plan personalizado. Entra a tu área para verlo y empezar.",
      cta: "Ver mi plan",
    }));
    return NextResponse.json({ ok: true, test: to, result });
  }

  // Simulación con TIEMPOS REALES: ?simulate=correo&hours=N[&stage=S]
  // Usa la misma lógica que el cron real y envía SOLO el aviso que tocaría a esa
  // hora (uno cada vez). Ej.: hours=6 → el de 6h; hours=8 → el de 8h; etc.
  const sim = req.nextUrl.searchParams.get("simulate");
  if (sim) {
    const to = normalizeEmail(sim);
    if (!isValidEmail(to)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
    const hours = Number(req.nextUrl.searchParams.get("hours"));
    if (!Number.isFinite(hours)) return NextResponse.json({ error: "Indica ?hours=N (horas activas transcurridas)." }, { status: 400 });
    const stage = Number(req.nextUrl.searchParams.get("stage") ?? "0") || 0;
    const next = PLAN_STAGES.find((s) => hours >= s.h && stage < s.stage);
    if (!next) {
      return NextResponse.json({ ok: true, simulate: to, hours, stage, sent: null, info: "A esas horas todavía no toca ningún aviso." });
    }
    try {
      await sendPlanUpdateEmail(to, { subject: next.subject, heading: next.heading, message: next.message });
      return NextResponse.json({ ok: true, simulate: to, hours, stage, sent: `${next.stage}h`, info: `Enviado el aviso de ${next.stage}h (uno solo, el que corresponde a esa hora).` });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
    }
  }

  const members = (await getMembers()).filter((m) => !isAdmin(m.email));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  let callSent = 0;
  let checkinSent = 0;

  // El cron corre cada hora (UTC), pero los recordatorios de videollamada y de
  // revisión deben salir por la mañana, no de madrugada. Los enviamos en la
  // primera ejecución a partir de esta hora local de Madrid (la idempotencia
  // evita reenvíos el resto del día).
  const REMINDER_HOUR = 10; // 10:00 (hora de Madrid)
  const nowHour = madridHour(new Date());

  // 1) Recordatorio de videollamada los jueves (idempotente: si el cron se
  //    dispara dos veces el mismo día, no reenvía gracias a last_call_reminder).
  if (madridDay() === "Thu" && nowHour >= REMINDER_HOUR) {
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
          body: "Nos vemos a las 17:30 (Madrid) en tu sesión con Aurena.",
          // Al hub: ahí está la cuenta atrás y el botón de acceso a la sala.
          // (/miembros/agenda es el calendario de la coach y redirige a las clientas.)
          url: "/miembros",
        }).catch((e) => console.error("[cron] push call", e));
        await sbUpsert("profiles", { email: m.email, last_call_reminder: today, updated_at: new Date().toISOString() });
        callSent++;
      } catch (e) { console.error("[cron] call", m.email, e); }
    }
  }

  // 1b) FIN DEL PLAZO DE ESPERA. A quien eligió la Opción 2 del Anexo II-A se
  //     le abrió el acceso solo a partir de `access_from`. El día que llega, se
  //     le avisa de que ya puede entrar. El guard deja de bloquear solo (compara
  //     la fecha), así que aquí basta con dar la noticia.
  let esperaAvisada = 0;
  if (nowHour >= REMINDER_HOUR) try {
    const listas = await sbSelect<{ email: string; access_from: string | null }>(
      "profiles",
      `select=email,access_from&access_from=eq.${today}`
    );
    for (const p of listas) {
      if (isAdmin(p.email)) continue;
      try {
        await sendEsperaTerminada(p.email);
        sendPushToEmail(p.email, {
          title: "Tu programa arranca hoy 🚀",
          body: "Ya puedes entrar: tienes tu área lista.",
          url: "/miembros",
        }).catch((e) => console.error("[cron] push espera", e));
        // Se limpia para no volver a avisar si la fecha se recalcula.
        await sbUpsert("profiles", { email: p.email, access_from: null, updated_at: new Date().toISOString() });
        esperaAvisada++;
      } catch (e) { console.error("[cron] espera", p.email, e); }
    }
  } catch (e) {
    console.error("[cron] fin de espera", e);
  }

  // 2) Revisiones en FECHAS FIJAS: día 1 y día 15 de cada mes.
  //
  //    Antes cada clienta llevaba su propio ciclo de quince días desde la última
  //    que hizo, y acababan repartidas por todo el calendario. Ahora todas caen
  //    el mismo día y la coach las compara de una sentada.
  //
  //    Se avisa a quien no la haya subido los días 0, 2 y 5 de la quincena, y a
  //    la coach se le pasa el parte de quién falta los días 3 y 8.
  const periodo = periodoDe(today);
  const quincenaDesde = `${periodo.inicio}T00:00:00`;
  let reportSent = false;

  if (nowHour >= REMINDER_HOUR) try {
    // Quién ya la ha subido EN ESTA QUINCENA (no "en los últimos 15 días").
    const hechas = new Set(
      (await sbSelect<{ member_email: string }>("check_ins", `select=member_email&created_at=gte.${quincenaDesde}`))
        .map((r) => r.member_email)
    );
    // `last_checkin_report` tiene que venir en el SELECT: es lo que evita que el
    // parte de la coach se le mande otra vez en cada pasada del cron (corre cada
    // hora). Sin pedirlo, siempre sale undefined y se enviaría catorce veces.
    const profs = await sbSelect<{
      email: string; display_name: string | null; last_checkin_reminder: string | null;
      created_at: string | null; last_checkin_report?: string | null;
    }>(
      "profiles",
      "select=email,display_name,last_checkin_reminder,created_at,last_checkin_report"
    ).catch(async (e) => {
      // Si la columna aún no existe (falta la migración), se lee sin ella para
      // que los recordatorios a las clientas sigan saliendo igualmente.
      console.error("[cron] sin last_checkin_report", e);
      return sbSelect<{
        email: string; display_name: string | null; last_checkin_reminder: string | null;
        created_at: string | null; last_checkin_report?: string | null;
      }>("profiles", "select=email,display_name,last_checkin_reminder,created_at");
    });
    const remMap = new Map(profs.map((p) => [p.email, p.last_checkin_reminder]));
    const joinedMap = new Map(profs.map((p) => [p.email, p.created_at]));
    const nameMap = new Map(profs.map((p) => [p.email, p.display_name]));
    const quien = (email: string) => nameMap.get(email) || email;

    // Margen para las recién llegadas: a quien lleve menos de tres días dada de
    // alta no se le reclama nada. Bastante tiene con instalarse y empezar.
    const reciente = isoDaysAgo(3);
    const enPlazo = members.filter((m) => {
      const joined = joinedMap.get(m.email);
      return !(joined && joined.slice(0, 10) >= reciente);
    });
    const faltan = enPlazo.filter((m) => !hechas.has(m.email));

    // 2a) Aviso a las clientas que la tienen sin subir.
    if (tocaAvisar(periodo)) {
      const aviso = textoAviso(periodo);
      for (const m of faltan) {
        // Un aviso al día como mucho: si el cron se dispara dos veces, no repite.
        if (remMap.get(m.email) === today) continue;
        try {
          await sendCheckinReminder(m.email, aviso);
          sendPushToEmail(m.email, {
            title: aviso.heading,
            body: periodo.dia === 0 ? "Hoy toca: peso y tus 3 fotos." : `Te falta la revisión del ${periodo.etiqueta}.`,
            url: "/miembros/checkins",
          }).catch((e) => console.error("[cron] push checkin", e));
          await sbUpsert("profiles", { email: m.email, last_checkin_reminder: today, updated_at: new Date().toISOString() });
          checkinSent++;
        } catch (e) { console.error("[cron] checkin", m.email, e); }
      }
    }

    // 2b) Parte para la coach: quién la ha hecho y quién no.
    //     Idempotente con `last_checkin_report` en su propia ficha, para que dos
    //     ejecuciones del mismo día no le manden el parte dos veces.
    const coaches = adminEmails();
    if (tocaParteCoach(periodo) && coaches.length > 0) {
      const yaEnviado = profs.find((p) => p.email === coaches[0]);
      if (yaEnviado?.last_checkin_report !== today) {
        try {
          await sendCheckinReport(
            coaches,
            periodo.etiqueta,
            enPlazo.filter((m) => hechas.has(m.email)).map((m) => quien(m.email)).sort(),
            faltan.map((m) => quien(m.email)).sort()
          );
          for (const c of coaches) {
            await sbUpsert("profiles", { email: c, last_checkin_report: today, updated_at: new Date().toISOString() }).catch(() => {});
          }
          reportSent = true;
        } catch (e) { console.error("[cron] parte revisiones", e); }
      }
    }
  } catch (e) {
    console.error("[cron] checkin reminders", e);
  }

  // 2b) Recordatorio DIARIO de hábitos (push) a una hora fija, solo a quien
  //     todavía no ha registrado sus hábitos hoy. Empuja a no perder la racha.
  const HABIT_HOUR = 19; // 19:00 (hora de Madrid)
  let habitPushed = 0;
  if (nowHour === HABIT_HOUR) try {
    const logged = new Set(
      (await sbSelect<{ member_email: string }>("habit_logs", `select=member_email&day=eq.${today}`)).map((r) => r.member_email)
    );
    for (const m of members) {
      if (logged.has(m.email)) continue; // ya registró hoy
      sendPushToEmail(m.email, {
        title: "¿Tus hábitos de hoy? 💧",
        body: "Registra tu agua, pasos y sueño para no perder la racha.",
        url: "/miembros/perfil",
      }).catch((e) => console.error("[cron] push habito", e));
      habitPushed++;
    }
  } catch (e) {
    console.error("[cron] habit reminder", e);
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

    for (const p of profs) {
      if (!p.questionnaire_completed_at) continue;
      if (!memberSet.has(p.email)) continue; // solo clientas activas
      if (planMembers.has(p.email)) continue; // ya tiene plan → sin avisos de espera
      const stage = p.plan_notice_stage ?? 0;
      const hours = activeHoursBetween(new Date(p.questionnaire_completed_at), new Date());
      const next = PLAN_STAGES.find((s) => hours >= s.h && stage < s.stage); // umbral de horas activas alcanzado
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

  // 4) Limpieza de vídeos de técnica ya corregidos hace +14 días. Se borra el
  //    archivo pesado de Storage (la corrección en texto se conserva).
  let techniqueCleaned = 0;
  try {
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
    const old = await sbSelect<{ id: string; video_path: string | null; coach_reply_path: string | null }>(
      "technique_reviews",
      `select=id,video_path,coach_reply_path&coach_reply_at=lt.${cutoff}&video_path=not.is.null`
    );
    for (const r of old) {
      try {
        if (r.video_path) await sbDeleteObject("tecnica", r.video_path);
        if (r.coach_reply_path) await sbDeleteObject("tecnica", r.coach_reply_path);
        await sbUpdate("technique_reviews", `id=eq.${encodeURIComponent(r.id)}`, { video_path: null, coach_reply_path: null });
        techniqueCleaned++;
      } catch (e) { console.error("[cron] limpieza técnica", r.id, e); }
    }
  } catch (e) {
    console.error("[cron] técnica cleanup", e);
  }

  return NextResponse.json({ ok: true, quincena: periodo.inicio, diaDeQuincena: periodo.dia, callSent, esperaAvisada, checkinSent, reportSent, habitPushed, planSeqSent, techniqueCleaned });
}
