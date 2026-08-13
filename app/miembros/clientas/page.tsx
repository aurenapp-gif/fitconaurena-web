import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AddClient from "@/components/AddClient";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { renewalInfo } from "@/lib/profile";
import { sbSelect } from "@/lib/supabase";
import { servicePct } from "@/lib/company";

export const metadata: Metadata = { title: "Clientas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null; renewal_date: string | null };
type Row = { member_email: string };
type CheckInRow = { member_email: string; created_at: string };
type PlanRow = { member_email: string; created_at: string };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default async function ClientasPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  // Todo en paralelo. Cada consulta cae por su cuenta para que el listado no se
  // caiga entero si una tabla flaquea.
  const [members, profiles, checkins, habits, plans, techniques] = await Promise.all([
    getMembers().then((ms) => ms.filter((m) => !isAdmin(m.email))),
    sbSelect<Prof>("profiles", "select=email,display_name,renewal_date")
      .catch((e) => { console.error("[clientas] profiles", e); return [] as Prof[]; }),
    sbSelect<CheckInRow>("check_ins", "select=member_email,created_at")
      .catch(() => [] as CheckInRow[]),
    sbSelect<Row & { day: string }>("habit_logs", "select=member_email,day")
      .catch(() => [] as (Row & { day: string })[]),
    sbSelect<PlanRow>("plans", "select=member_email,created_at")
      .catch(() => [] as PlanRow[]),
    sbSelect<Row>("technique_reviews", "select=member_email")
      .catch(() => [] as Row[]),
  ]);

  // Indexes por email, para no recorrer las listas por cada clienta.
  const profByEmail = new Map(profiles.map((p) => [p.email, p]));
  const checkinsByEmail = new Map<string, CheckInRow[]>();
  for (const c of checkins) {
    const arr = checkinsByEmail.get(c.member_email) ?? [];
    arr.push(c); checkinsByEmail.set(c.member_email, arr);
  }
  const daysByEmail = new Map<string, Set<string>>();
  const add = (e: string, d: string) => {
    const s = daysByEmail.get(e) ?? new Set<string>();
    s.add(d); daysByEmail.set(e, s);
  };
  for (const c of checkins) add(c.member_email, c.created_at.slice(0, 10));
  for (const h of habits) add(h.member_email, h.day);
  const countBy = (rows: Row[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.member_email, (m.get(r.member_email) ?? 0) + 1);
    return m;
  };
  const plansByEmail = countBy(plans);
  const techByEmail = countBy(techniques);
  const planDatesByEmail = new Map<string, string[]>();
  for (const p of plans) {
    const arr = planDatesByEmail.get(p.member_email) ?? [];
    arr.push(p.created_at); planDatesByEmail.set(p.member_email, arr);
  }

  const rows = members.map((m) => {
    const p = profByEmail.get(m.email);
    const cks = checkinsByEmail.get(m.email) ?? [];
    const last = cks.length
      ? cks.map((c) => c.created_at).sort().slice(-1)[0]
      : null;
    return {
      email: m.email,
      name: p?.display_name || m.name,
      renewal: renewalInfo(p?.renewal_date ?? null),
      pct: servicePct(p?.renewal_date, planDatesByEmail.get(m.email) ?? [])?.pct ?? null,
      daysUsed: (daysByEmail.get(m.email) ?? new Set()).size,
      checkins: cks.length,
      plans: plansByEmail.get(m.email) ?? 0,
      techniques: techByEmail.get(m.email) ?? 0,
      lastCheckin: last,
    };
  });
  // Ordenadas por urgencia de renovación (las que menos días faltan primero).
  rows.sort((a, b) => {
    const A = a.renewal.days ?? 9999, B = b.renewal.days ?? 9999;
    return A - B;
  });

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Clientas</h1>
              <p className="text-sm text-[#666666] mt-1">{members.length} activa{members.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          <AddClient />

          {members.length === 0 ? (
            <p className="text-[#A0A0A0]">Aún no tienes clientas dadas de alta (grupo &quot;Miembros&quot; en MailerLite).</p>
          ) : (
            <div className="grid gap-3">
              {rows.map((r) => (
                <Link key={r.email} href={`/miembros/clientas/${encodeURIComponent(r.email)}`}
                  className="card-dark p-4 !transform-none block">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{r.name}</p>
                      <p className="text-xs text-[#666666] truncate">{r.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${r.renewal.urgent ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>
                      {r.renewal.text}
                    </span>
                  </div>

                  {r.pct != null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#1CA0E3]">
                          Servicio consumido
                        </span>
                        <span className="text-xs font-bold text-white tabular-nums">{r.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0A0A0A] overflow-hidden">
                        <div className="h-full bg-[#1CA0E3]" style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-extrabold text-white leading-none">{r.daysUsed}</div>
                      <div className="text-[9px] text-[#666666] mt-1 leading-tight">días de uso</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-white leading-none">{r.checkins}</div>
                      <div className="text-[9px] text-[#666666] mt-1 leading-tight">check-ins</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-white leading-none">{r.plans}</div>
                      <div className="text-[9px] text-[#666666] mt-1 leading-tight">planes</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-white leading-none">{r.techniques}</div>
                      <div className="text-[9px] text-[#666666] mt-1 leading-tight">vídeos</div>
                    </div>
                  </div>

                  {r.lastCheckin && (
                    <p className="text-[10px] text-[#666666] mt-3">
                      Último check-in: {fmtDate(r.lastCheckin)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
