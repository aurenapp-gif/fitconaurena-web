import { NextRequest, NextResponse } from "next/server";
import { getMembers, isAdmin } from "@/lib/members";
import { sbSelect, sbUpsert } from "@/lib/supabase";
import { sendCallReminder, sendCheckinReminder } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 60;

function madridDay(): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(new Date());
}
function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  // Solo Vercel Cron (envía Authorization: Bearer CRON_SECRET).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const members = (await getMembers()).filter((m) => !isAdmin(m.email));
  let callSent = 0;
  let checkinSent = 0;

  // 1) Recordatorio de videollamada los jueves.
  if (madridDay() === "Thu") {
    for (const m of members) {
      try { await sendCallReminder(m.email); callSent++; } catch (e) { console.error("[cron] call", m.email, e); }
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
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

    for (const m of members) {
      if (recent.has(m.email)) continue; // hizo check-in hace poco
      const lastRem = remMap.get(m.email);
      if (lastRem && lastRem >= since) continue; // ya se le recordó hace <15d
      try {
        await sendCheckinReminder(m.email);
        await sbUpsert("profiles", { email: m.email, last_checkin_reminder: today, updated_at: new Date().toISOString() });
        checkinSent++;
      } catch (e) { console.error("[cron] checkin", m.email, e); }
    }
  } catch (e) {
    console.error("[cron] checkin reminders", e);
  }

  return NextResponse.json({ ok: true, callSent, checkinSent });
}
