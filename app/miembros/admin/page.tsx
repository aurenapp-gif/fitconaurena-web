import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ContractTemplateUpload from "@/components/ContractTemplateUpload";
import ContractTemplatesList from "@/components/ContractTemplatesList";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { renewalInfo } from "@/lib/profile";
import { sbSelect } from "@/lib/supabase";
import { type ContractTemplate } from "@/lib/contract";

export const metadata: Metadata = { title: "Panel admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

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

  const since = isoDaysAgo(15);

  // Todas las lecturas independientes del panel, en paralelo (antes iban en cascada).
  const [checkins, members, profiles, recentList, pending, templates, totalSigned] = await Promise.all([
    sbSelect<CheckIn>("check_ins", "select=id,member_email,weight,created_at,coach_reply&order=created_at.desc&limit=10")
      .catch((e) => { console.error("[admin] checkins", e); return [] as CheckIn[]; }),
    getMembers().then((ms) => ms.filter((m) => !isAdmin(m.email)))
      .catch((e) => { console.error("[admin] members", e); return [] as { email: string; name: string }[]; }),
    sbSelect<Prof>("profiles", "select=email,display_name,renewal_date")
      .catch((e) => { console.error("[admin] profiles", e); return [] as Prof[]; }),
    sbSelect<{ member_email: string }>("check_ins", `select=member_email&created_at=gte.${since}`)
      .catch((e) => { console.error("[admin] recent", e); return [] as { member_email: string }[]; }),
    sbSelect<{ id: string }>("check_ins", "select=id&coach_reply=is.null")
      .catch((e) => { console.error("[admin] pending", e); return [] as { id: string }[]; }),
    sbSelect<ContractTemplate>("contract_templates", "select=*&order=created_at.desc")
      .catch((e) => { console.error("[admin] contract templates", e); return [] as ContractTemplate[]; }),
    sbSelect<{ id: string }>("contract_signatures", "select=id")
      .then((r) => r.length).catch(() => 0),
  ]);

  const byEmail = new Map(profiles.map((p) => [p.email, p]));
  const nameOf = (e: string) => byEmail.get(e)?.display_name || members.find((m) => m.email === e)?.name || e;
  const recentSet = new Set(recentList.map((r) => r.member_email));
  const pendingCount = pending.length;
  const activeTemplates = templates.filter((t) => t.active);
  const contratosCount = activeTemplates.filter((t) => t.kind === "contrato").length;
  const anexoActive = activeTemplates.find((t) => t.kind === "anexo_salud");

  const renewals = members
    .map((m) => ({ m, r: renewalInfo(byEmail.get(m.email)?.renewal_date ?? null) }))
    .filter((x) => x.r.days != null && x.r.days <= 5)
    .sort((a, b) => (a.r.days as number) - (b.r.days as number));
  const noCheckin = members.filter((m) => !recentSet.has(m.email));

  const stats = [
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
            <h2 className="font-bold text-ink mb-3">Hoy</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`text-center px-3 py-4 rounded-xl border ${s.urgent ? "border-brand/40 bg-brand/5" : "border-line bg-page"}`}
                >
                  <div className={`text-3xl font-extrabold leading-none ${s.urgent ? "text-brand" : "text-ink"}`}>{s.value}</div>
                  <div className="text-xs text-ink-muted mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>

            {(renewals.length > 0 || noCheckin.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {renewals.length > 0 && (
                  <div className="card-dark p-4 !transform-none">
                    <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">Renovaciones próximas</p>
                    <div className="flex flex-col gap-1.5">
                      {renewals.map(({ m, r }) => (
                        <Link key={m.email} href={`/miembros/clientas/${encodeURIComponent(m.email)}`} className="flex items-center justify-between gap-2 hover:opacity-80">
                          <span className="text-sm text-ink truncate">{nameOf(m.email)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.urgent ? "bg-danger text-white" : "border border-line text-ink-muted"}`}>{r.text}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {noCheckin.length > 0 && (
                  <div className="card-dark p-4 !transform-none">
                    <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">Sin check-in (15 días)</p>
                    <div className="flex flex-col gap-1.5">
                      {noCheckin.map((m) => (
                        <Link key={m.email} href={`/miembros/clientas/${encodeURIComponent(m.email)}`} className="flex items-center justify-between gap-2 hover:opacity-80">
                          <span className="text-sm text-ink truncate">{nameOf(m.email)}</span>
                          <span className="text-[10px] text-ink-subtle shrink-0">ver ficha →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Contratos (varias plantillas) + anexo de salud (común) */}
          <section className="mb-8">
            <div className="card-dark p-6 !transform-none">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-ink">Contratos y anexo de salud</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted">
                    {contratosCount} contrato{contratosCount === 1 ? "" : "s"} · {anexoActive ? "anexo listo" : "sin anexo"} · {totalSigned} firmado{totalSigned === 1 ? "" : "s"}
                  </span>
                  <Link href="/miembros/contratos" className="text-brand text-sm font-semibold">Ver firmados →</Link>
                </div>
              </div>
              <p className="text-sm text-ink-muted mb-4">
                Sube varias plantillas de contrato (por ejemplo, por precio: 1197, 1497, 1897) y una sola plantilla de anexo de salud. Al dar de alta a una clienta desde su ficha, eliges qué contrato le corresponde; el anexo se le asigna automáticamente.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">Añadir plantilla</p>
                  <ContractTemplateUpload />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">Plantillas actuales</p>
                  <ContractTemplatesList templates={templates} />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6">
            {/* Check-ins recientes */}
            <section>
              <h2 className="font-bold text-ink mb-3">Check-ins recientes</h2>
              {checkins.length === 0 ? (
                <p className="text-sm text-ink-muted">Aún no hay check-ins.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {checkins.map((c) => (
                    <div key={c.id} className="card-dark p-4 !transform-none flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{c.member_email}</p>
                        <p className="text-xs text-ink-muted">
                          {c.weight != null ? `${c.weight} kg` : "Sin peso"} · {c.coach_reply ? "respondido" : "pendiente"}
                        </p>
                      </div>
                      <span className="text-[10px] text-ink-subtle shrink-0">{fmt(c.created_at)}</span>
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
