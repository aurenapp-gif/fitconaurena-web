import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { renewalInfo } from "@/lib/profile";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Panel admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Msg = {
  id: string;
  member_email: string;
  sender: "member" | "coach";
  body: string;
  read_by_coach: boolean;
  created_at: string;
};
type CheckIn = { id: string; member_email: string; weight: number | null; created_at: string; coach_reply: string | null };

type Prof = { email: string; display_name: string | null; renewal_date: string | null };

function fmt(d: string) {
  return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export default async function AdminPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  let msgs: Msg[] = [];
  let checkins: CheckIn[] = [];
  try {
    msgs = await sbSelect<Msg>("messages", "select=id,member_email,sender,body,read_by_coach,created_at&order=created_at.desc&limit=300");
  } catch (e) { console.error("[admin] msgs", e); }
  try {
    checkins = await sbSelect<CheckIn>("check_ins", "select=id,member_email,weight,created_at,coach_reply&order=created_at.desc&limit=10");
  } catch (e) { console.error("[admin] checkins", e); }

  // Agrupar conversaciones por clienta.
  const convs = new Map<string, { last: Msg; unread: number }>();
  for (const m of msgs) {
    const c = convs.get(m.member_email);
    const unreadInc = m.sender === "member" && !m.read_by_coach ? 1 : 0;
    if (!c) convs.set(m.member_email, { last: m, unread: unreadInc });
    else c.unread += unreadInc; // `last` ya es el más reciente (orden desc)
  }
  const conversations = Array.from(convs.entries());
  const unreadConvs = conversations.filter(([, v]) => v.unread > 0);

  // --- Datos para el panel "Hoy" (todo con degradación segura) ---
  const members = (await getMembers()).filter((m) => !isAdmin(m.email));
  let profiles: Prof[] = [];
  try { profiles = await sbSelect<Prof>("profiles", "select=email,display_name,renewal_date"); } catch (e) { console.error("[admin] profiles", e); }
  const byEmail = new Map(profiles.map((p) => [p.email, p]));
  const nameOf = (e: string) => byEmail.get(e)?.display_name || members.find((m) => m.email === e)?.name || e;

  const since = isoDaysAgo(15);
  let recentSet = new Set<string>();
  try {
    recentSet = new Set(
      (await sbSelect<{ member_email: string }>("check_ins", `select=member_email&created_at=gte.${since}`)).map((r) => r.member_email)
    );
  } catch (e) { console.error("[admin] recent", e); }
  let pendingCount = 0;
  try {
    pendingCount = (await sbSelect<{ id: string }>("check_ins", "select=id&coach_reply=is.null")).length;
  } catch (e) { console.error("[admin] pending", e); }

  const renewals = members
    .map((m) => ({ m, r: renewalInfo(byEmail.get(m.email)?.renewal_date ?? null) }))
    .filter((x) => x.r.days != null && x.r.days <= 5)
    .sort((a, b) => (a.r.days as number) - (b.r.days as number));
  const noCheckin = members.filter((m) => !recentSet.has(m.email));

  const stats = [
    { value: unreadConvs.length, label: "sin responder", urgent: unreadConvs.length > 0 },
    { value: pendingCount, label: "check-ins pendientes", urgent: pendingCount > 0 },
    { value: renewals.length, label: "renovaciones ≤5d", urgent: renewals.length > 0 },
    { value: noCheckin.length, label: "sin check-in 15d", urgent: false },
  ];

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Panel de la coach</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/miembros/clientas" className="btn-brand text-sm px-5 py-2.5">Clientas</Link>
              <Link href="/miembros/leads" className="btn-brand text-sm px-5 py-2.5">Leads / CRM</Link>
              <Link href="/miembros/agenda" className="btn-brand text-sm px-5 py-2.5">Agenda</Link>
              <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
            </div>
          </div>

          {/* Panel "Hoy": resumen accionable de la coach */}
          <section className="mb-8">
            <h2 className="font-bold text-white mb-3">Hoy</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`text-center px-3 py-4 rounded-xl border ${s.urgent ? "border-[#CAFF00]/40 bg-[#CAFF00]/5" : "border-[#252525] bg-[#141414]"}`}
                >
                  <div className={`text-3xl font-extrabold leading-none ${s.urgent ? "text-[#CAFF00]" : "text-white"}`}>{s.value}</div>
                  <div className="text-xs text-[#A0A0A0] mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>

            {(renewals.length > 0 || noCheckin.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {renewals.length > 0 && (
                  <div className="card-dark p-4 !transform-none">
                    <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">Renovaciones próximas</p>
                    <div className="flex flex-col gap-1.5">
                      {renewals.map(({ m, r }) => (
                        <Link key={m.email} href={`/miembros/clientas/${encodeURIComponent(m.email)}`} className="flex items-center justify-between gap-2 hover:opacity-80">
                          <span className="text-sm text-white truncate">{nameOf(m.email)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.urgent ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>{r.text}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {noCheckin.length > 0 && (
                  <div className="card-dark p-4 !transform-none">
                    <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">Sin check-in (15 días)</p>
                    <div className="flex flex-col gap-1.5">
                      {noCheckin.map((m) => (
                        <Link key={m.email} href={`/miembros/admin/chat/${encodeURIComponent(m.email)}`} className="flex items-center justify-between gap-2 hover:opacity-80">
                          <span className="text-sm text-white truncate">{nameOf(m.email)}</span>
                          <span className="text-[10px] text-[#666666] shrink-0">enviar recordatorio →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chats */}
            <section>
              <h2 className="font-bold text-white mb-3">Chats</h2>
              {conversations.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">Aún no hay conversaciones.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {conversations.map(([member, { last, unread }]) => (
                    <Link
                      key={member}
                      href={`/miembros/admin/chat/${encodeURIComponent(member)}`}
                      className="card-dark p-4 !transform-none flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{member}</p>
                        <p className="text-xs text-[#A0A0A0] truncate">
                          {last.sender === "coach" ? "Tú: " : ""}{last.body}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-[#666666]">{fmt(last.created_at)}</span>
                        {unread > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CAFF00] text-[#0A0A0A]">
                            {unread} nuevo{unread > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Check-ins recientes */}
            <section>
              <h2 className="font-bold text-white mb-3">Check-ins recientes</h2>
              {checkins.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">Aún no hay check-ins.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {checkins.map((c) => (
                    <div key={c.id} className="card-dark p-4 !transform-none flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{c.member_email}</p>
                        <p className="text-xs text-[#A0A0A0]">
                          {c.weight != null ? `${c.weight} kg` : "Sin peso"} · {c.coach_reply ? "respondido" : "pendiente"}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#666666] shrink-0">{fmt(c.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/miembros/checkins" className="btn-outline text-sm px-5 py-2.5 mt-3 inline-flex">
                Ver y responder check-ins
              </Link>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
