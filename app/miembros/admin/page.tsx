import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import ContractTemplateUpload from "@/components/ContractTemplateUpload";
import ContractTemplatesList from "@/components/ContractTemplatesList";
import CallUrlSetter from "@/components/CallUrlSetter";
import { AJUSTE_SALA, leerAjuste } from "@/lib/ajustes";
import { TEXTO_DIA_LLAMADA, TEXTO_HORA_LLAMADA } from "@/lib/llamada-grupal";
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
  const salaGuardada = await leerAjuste(AJUSTE_SALA);
  // Lo que le preguntan a FitAI: es donde se ve qué no está claro.
  const preguntas = await sbSelect<{ id: string; member_email: string; question: string; derivada: boolean; created_at: string }>(
    "fitai_messages", "select=id,member_email,question,derivada,created_at&order=created_at.desc&limit=12"
  ).catch(() => [] as { id: string; member_email: string; question: string; derivada: boolean; created_at: string }[]);

  const since = isoDaysAgo(15);

  // Todas las lecturas independientes del panel, en paralelo (antes iban en cascada).
  const [checkins, members, profiles, recentList, pending, templates, totalSigned, tecnicasPendientes, habitos30] = await Promise.all([
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
    // Vídeos de técnica esperando corrección.
    sbSelect<{ id: string; member_email: string; created_at: string }>(
      "technique_reviews", "select=id,member_email,created_at&coach_reply=is.null&order=created_at.asc"
    ).catch(() => [] as { id: string; member_email: string; created_at: string }[]),
    // Un mes de hábitos, para saber quién se está descolgando.
    sbSelect<{ member_email: string; day: string }>(
      "habit_logs", `select=member_email,day&day=gte.${isoDaysAgo(30)}`
    ).catch(() => [] as { member_email: string; day: string }[]),
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

  // QUIÉN SE ESTÁ DESCOLGANDO. El último día que apuntó algo, por clienta. Solo
  // cuentan las que alguna vez han apuntado: a una recién dada de alta no se
  // la marca como perdida el primer día.
  const ultimoDia = new Map<string, string>();
  for (const h of habitos30) {
    const previo = ultimoDia.get(h.member_email);
    if (!previo || h.day > previo) ultimoDia.set(h.member_email, h.day);
  }
  const hoyStr = new Date().toISOString().slice(0, 10);
  const diasSin = (d: string) => Math.round((Date.parse(`${hoyStr}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`)) / 86400000);
  const descolgadas = members
    .map((m) => ({ m, dia: ultimoDia.get(m.email) }))
    .filter((x): x is { m: { email: string; name: string }; dia: string } => !!x.dia)
    .map((x) => ({ ...x, dias: diasSin(x.dia) }))
    .filter((x) => x.dias >= 6)
    .sort((a, b) => b.dias - a.dias);

  /** Lo que la coach tiene esperando, de lo más antiguo a lo más nuevo. */
  const esperando = [
    pendingCount > 0 && {
      icono: "revision" as const,
      texto: `${pendingCount} ${pendingCount === 1 ? "revisión sin responder" : "revisiones sin responder"}`,
      sub: checkins.find((c) => !c.coach_reply)
        ? `La más antigua, de ${nameOf([...checkins].reverse().find((c) => !c.coach_reply)!.member_email)}`
        : undefined,
      href: "/miembros/checkins",
    },
    tecnicasPendientes.length > 0 && {
      icono: "video" as const,
      texto: `${tecnicasPendientes.length} ${tecnicasPendientes.length === 1 ? "vídeo de técnica" : "vídeos de técnica"}`,
      sub: tecnicasPendientes.slice(0, 2).map((t) => nameOf(t.member_email)).join(", "),
      href: "/miembros/tecnica",
    },
    renewals.length > 0 && {
      icono: "plan" as const,
      texto: `${renewals.length} ${renewals.length === 1 ? "plan caduca" : "planes caducan"} esta semana`,
      sub: renewals.slice(0, 2).map((x) => nameOf(x.m.email)).join(", "),
      href: "/miembros/clientas",
    },
  ].filter(Boolean) as { icono: "revision" | "video" | "plan"; texto: string; sub?: string; href: string }[];

  const stats = [
    { value: pendingCount, label: "check-ins pendientes", urgent: pendingCount > 0 },
    { value: renewals.length, label: "renovaciones ≤5d", urgent: renewals.length > 0 },
    { value: noCheckin.length, label: "sin check-in 15d", urgent: false },
  ];

  return (
    <>
      <AppShell admin />
      <main className="app-main relative min-h-screen">
        <div className="container-wide relative z-10 py-6 lg:py-12">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Panel de la coach</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/miembros/clientas" className="btn-brand text-sm px-5 py-2.5">Clientas</Link>
              <Link href="/miembros/leads" className="btn-brand text-sm px-5 py-2.5">Leads / CRM</Link>
              <Link href="/miembros/agenda" className="btn-brand text-sm px-5 py-2.5">Agenda</Link>
            </div>
          </div>

          {/* LO PRIMERO: lo que te está esperando. El panel enseñaba datos; lo
              que hace falta al abrirlo es saber qué hay que hacer. */}
          {(esperando.length > 0 || descolgadas.length > 0) && (
            <section className="mb-8">
              <h2 className="font-bold text-ink mb-1">
                {esperando.length > 0
                  ? `Tienes ${esperando.length} ${esperando.length === 1 ? "cosa esperando" : "cosas esperando"}`
                  : "Nada pendiente de responder"}
              </h2>
              <p className="text-xs text-ink-muted mb-3">Lo que no avanza si no lo tocas tú.</p>

              {esperando.length > 0 && (
                <div className="bg-surface rounded-[14px] px-4 mb-3">
                  {esperando.map((x, i) => (
                    <Link key={x.href + i} href={x.href}
                      className={`flex items-center gap-3.5 py-3.5 ${i ? "border-t border-line" : ""}`}>
                      <span aria-hidden="true" className={`w-10 h-10 rounded-[12px] grid place-items-center shrink-0 ${
                        x.icono === "revision" ? "bg-warn-soft" : x.icono === "video" ? "bg-brand-soft" : "bg-success-soft"}`}>
                        {x.icono === "revision" && (
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-warn))" strokeWidth="1.8"><rect x="5" y="4" width="14" height="17" rx="2.4" /><path d="M9 13l2.2 2.2L15.2 11" /></svg>
                        )}
                        {x.icono === "video" && (
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-brand))" strokeWidth="1.8"><rect x="3" y="6" width="13" height="12" rx="2.6" /><path d="M16 11l5-3v8l-5-3z" /></svg>
                        )}
                        {x.icono === "plan" && (
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-success))" strokeWidth="1.8"><path d="M5.6 4.4h9l4.8 4.8v10.4H5.6z" /><path d="M14.2 4.4v5h5" /></svg>
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[17px] font-semibold text-ink">{x.texto}</span>
                        {x.sub && <span className="block text-[15px] text-ink-muted truncate">{x.sub}</span>}
                      </span>
                      <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle shrink-0" aria-hidden="true">
                        <path d="M1.5 1.5L7 7.5l-5.5 6" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}

              {/* Quien se está descolgando. No se va de golpe: deja de apuntar,
                  deja de subir la revisión, y un mes después no renueva. */}
              {descolgadas.slice(0, 4).map((d) => (
                <Link key={d.m.email} href={`/miembros/clientas/${encodeURIComponent(d.m.email)}`}
                  className="flex items-center gap-3 bg-danger-soft rounded-[14px] px-4 py-3.5 mb-2">
                  <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-danger shrink-0" />
                  <span className="flex-1 min-w-0 text-[16px] text-danger truncate">
                    {nameOf(d.m.email)} lleva {d.dias} días sin apuntar nada
                  </span>
                  <span className="text-[15px] font-semibold text-danger shrink-0">Ver</span>
                </Link>
              ))}
            </section>
          )}

          {/* Lo que preguntan a FitAI */}
          {preguntas.length > 0 && (
            <section className="card-dark p-6 !transform-none mb-8">
              <h2 className="font-bold text-ink mb-1">Lo que le preguntan a FitAI</h2>
              <p className="text-xs text-ink-muted mb-4">
                Las últimas {preguntas.length}. Las marcadas son las que no supo resolver y derivó a ti: si una se repite, merece un comunicado o un minuto en la llamada.
              </p>
              <div className="flex flex-col gap-2">
                {preguntas.map((q) => (
                  <div key={q.id} className="rounded-lg border border-line px-4 py-2.5">
                    <p className="text-sm text-ink">{q.question}</p>
                    <p className="text-xs text-ink-subtle mt-1">
                      {q.member_email} · {new Date(q.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                      {q.derivada && <span className="text-warn"> · te la derivó</span>}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Videollamada grupal: el enlace de la sala, editable sin tocar Vercel */}
          <section className="card-dark p-6 !transform-none mb-8">
            <h2 className="font-bold text-ink mb-1">Videollamada grupal</h2>
            <p className="text-xs text-ink-muted mb-4">Todos los {TEXTO_DIA_LLAMADA} a las {TEXTO_HORA_LLAMADA} (hora de Madrid). Si cambias la reunión de Zoom, pega aquí el enlace nuevo.</p>
            <CallUrlSetter initial={salaGuardada ?? ""} />
          </section>

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
