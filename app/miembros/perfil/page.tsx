import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import PushToggle from "@/components/PushToggle";
import PwaInstall from "@/components/PwaInstall";
import PerfilTabs from "@/components/PerfilTabs";
import HabitsTracker from "@/components/HabitsTracker";
import FileViewer from "@/components/FileViewer";
import CallLink from "@/components/CallLink";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { callDay, DEFAULT_TITLE, type MemberCall } from "@/lib/llamadas";
import { pauta, type Supplement } from "@/lib/suplementos";
import type { Questionnaire } from "@/lib/profile";
import { CONTRACT_BUCKET, type ContractSignature, type ContractTemplate } from "@/lib/contract";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null; questionnaire_completed_at: string | null; water_target_l?: number | null; steps_target?: number | null };
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; note?: string | null; file_path: string; created_at: string };
type HabitRow = { day: string; water: number | null; steps: number | null; sleep: number | null };

/** Todos los planes de un tipo, del más reciente al más antiguo. El primero se
 * marca como "Actual"; los anteriores quedan accesibles debajo (historial). */
function PlanList({ items, label, empty, fallo }: { items: (Plan & { url?: string })[]; label: string; empty: string; fallo?: boolean }) {
  // Decirle «tu coach aún no ha subido tu plan» cuando lo que ha pasado es que
  // no se ha podido consultar sería el peor error posible de esta pantalla.
  if (fallo) return (
    <p role="alert" className="text-sm text-[#FF6B6B]">
      No hemos podido cargar tus planes ahora mismo. Vuelve a entrar en un momento: no se ha perdido nada.
    </p>
  );
  if (items.length === 0) return <p className="text-sm text-[#666666]">{empty}</p>;
  return (
    <div className="flex flex-col gap-4">
      {items.map((p, i) => (
        <div key={p.id} className={i > 0 ? "border-t border-[#252525] pt-4" : ""}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {i === 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">Actual</span>
            )}
            <span className="text-xs text-[#666666]">
              {new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
          {p.title && <p className="text-sm text-[#A0A0A0] mb-1">{p.title}</p>}
          {p.url ? (
            <FileViewer url={p.url} label={label} buttonText={i === 0 ? "Ver plan" : "Ver"} />
          ) : (
            <p className="text-sm text-[#666666]">No disponible ahora mismo. Vuelve a entrar en un momento.</p>
          )}
          <PlanNote note={p.note} />
        </div>
      ))}
    </div>
  );
}

/** Comentario que la coach deja junto al plan (indicaciones, cambios…). */
function PlanNote({ note }: { note?: string | null }) {
  if (!note) return null;
  return (
    <div className="mt-3 rounded-lg border border-[#1CA0E3]/30 bg-[#1CA0E3]/5 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#1CA0E3] mb-1">Nota de tu coach</p>
      <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{note}</p>
    </div>
  );
}

function todayMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}
// Racha de días seguidos con registro (cuenta hacia atrás desde hoy; si hoy aún
// no se ha registrado, empieza desde ayer para no romper la racha).
function dayStreak(set: Set<string>, today: string): number {
  let streak = 0;
  const d = new Date(today + "T00:00:00Z");
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

export default async function PerfilPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // 1ª tanda: todo lo independiente en paralelo (una sola ida/vuelta, no en cascada).
  const [profile, plans, habitRows, signatures, calls, supplements] = await Promise.all([
    sbSelect<Profile>("profiles", `select=*&email=eq.${encodeURIComponent(email)}`)
      .then((r) => r[0] ?? null)
      .catch((e) => { console.error("[perfil] profile", e); return null; }),
    // null si falla la consulta, para no confundirlo con «no tiene planes».
    sbSelect<Plan>("plans", `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=200`)
      .catch((e) => { console.error("[perfil] plans", e); return null; }),
    admin
      ? Promise.resolve([] as HabitRow[])
      : sbSelect<HabitRow>(
          "habit_logs",
          `select=day,water,steps,sleep&member_email=eq.${encodeURIComponent(email)}&day=gte.${since}&order=day.asc`
        ).catch((e) => { console.error("[perfil] habits", e); return [] as HabitRow[]; }),
    admin
      ? Promise.resolve([] as ContractSignature[])
      : sbSelect<ContractSignature>(
          "contract_signatures",
          `select=*&member_email=eq.${encodeURIComponent(email)}&order=signed_at.desc`
        ).catch((e) => { console.error("[perfil] contract signatures", e); return [] as ContractSignature[]; }),
    admin
      ? Promise.resolve([] as MemberCall[])
      : sbSelect<MemberCall>(
          "member_calls",
          `select=*&member_email=eq.${encodeURIComponent(email)}&order=call_date.desc.nullslast,created_at.desc`
        ).catch((e) => { console.error("[perfil] llamadas", e); return [] as MemberCall[]; }),
    admin
      ? Promise.resolve([] as Supplement[])
      : sbSelect<Supplement>(
          "member_supplements",
          `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc`
        ).catch((e) => { console.error("[perfil] suplementos", e); return [] as Supplement[]; }),
  ]);

  // Plantillas asociadas a las firmas (para poder mostrar título + kind).
  const sigTplIds = Array.from(new Set(signatures.map((s) => s.template_id).filter((x): x is string => !!x)));
  const sigTemplates = sigTplIds.length
    ? await sbSelect<ContractTemplate>(
        "contract_templates",
        `select=id,title,kind&id=in.(${sigTplIds.join(",")})`
      ).catch(() => [] as ContractTemplate[])
    : [];
  const sigTplById = new Map(sigTemplates.map((t) => [t.id, t]));

  // 2ª tanda: URLs firmadas de planes, foto y PDFs de contratos firmados.
  const [planUrls, photoUrl, signedPdfUrls] = await Promise.all([
    Promise.all((plans ?? []).map((p) => sbSignedUrl("planes", p.file_path, 3600).catch(() => undefined))),
    profile?.photo_path ? sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
    Promise.all(signatures.map((s) => s.signed_pdf_path ? sbSignedUrl(CONTRACT_BUCKET, s.signed_pdf_path, 3600).catch(() => undefined) : Promise.resolve(undefined))),
  ]);
  const contratosFirmados = signatures.map((s, i) => ({
    id: s.id,
    signedAt: s.signed_at,
    title: (s.template_id && sigTplById.get(s.template_id)?.title) || "Contrato",
    kind: (s.template_id && sigTplById.get(s.template_id)?.kind) || "contrato",
    url: signedPdfUrls[i],
  }));

  const planesFallo = plans === null;
  const plansWithUrl = (plans ?? []).map((p, i) => ({ ...p, url: planUrls[i] }));
  const nutPlans = plansWithUrl.filter((p) => p.type === "nutricion");
  const entPlans = plansWithUrl.filter((p) => p.type === "entrenamiento");

  const today = todayMadrid();
  const loggedDays = new Set(habitRows.map((r) => r.day));
  const todayRow = habitRows.find((r) => r.day === today);
  const habitToday = { water: todayRow?.water ?? null, steps: todayRow?.steps ?? null, sleep: todayRow?.sleep ?? null };
  const habitStreak = dayStreak(loggedDays, today);
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    return { label: new Date(ds + "T00:00:00Z").toLocaleDateString("es-ES", { weekday: "narrow", timeZone: "UTC" }), done: loggedDays.has(ds) };
  });

  const planCard = (
    <div className="card-dark p-6 !transform-none">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="font-bold text-white">Mi plan</h2>
        {profile?.renewal_date && (
          <span className="text-xs text-[#A0A0A0]">Renovación: {new Date(profile.renewal_date).toLocaleDateString("es-ES")}</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#252525] p-4">
          <p className="font-bold text-white mb-3">🥗 Nutrición</p>
          <PlanList items={nutPlans} label="Plan de nutrición" empty="Tu coach aún no ha subido tu plan de nutrición." fallo={planesFallo} />
        </div>
        <div className="rounded-xl border border-[#252525] p-4">
          <p className="font-bold text-white mb-3">🏋️ Entrenamiento</p>
          <PlanList items={entPlans} label="Plan de entrenamiento" empty="Tu coach aún no ha subido tu plan de entrenamiento." fallo={planesFallo} />
        </div>
      </div>

      {/* Suplementación: qué toma, cuánto, cuándo y dónde comprarlo. */}
      {supplements.length > 0 && (
        <div className="rounded-xl border border-[#252525] p-4 mt-4">
          <p className="font-bold text-white mb-1">💊 Suplementación</p>
          <p className="text-xs text-[#666666] mb-3">Lo que te ha pautado tu coach. Si tienes dudas, pregúntale antes de cambiar nada.</p>
          <div className="flex flex-col gap-2">
            {supplements.map((s) => (
              <div key={s.id} className="rounded-lg border border-[#252525] px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{s.name}</span>
                    {pauta(s) && <span className="block text-xs text-[#A0A0A0] mt-0.5">{pauta(s)}</span>}
                  </span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm font-semibold shrink-0">
                      Comprarlo
                    </a>
                  )}
                </div>
                {s.note && <p className="text-xs text-[#A0A0A0] mt-1.5 whitespace-pre-wrap border-t border-[#252525] pt-1.5">{s.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const profileForm = (
    <ProfileForm
      initialName={profile?.display_name ?? ""}
      initialQuestionnaire={profile?.questionnaire ?? {}}
      photoUrl={photoUrl}
      admin={admin}
      submitted={!!profile?.questionnaire_completed_at}
    />
  );

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Mi perfil</h1>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {admin ? (
            profileForm
          ) : (
            <PerfilTabs
              tabs={[
                { id: "datos", icon: "📋", label: "Datos", node: <div className="flex flex-col gap-8">{planCard}{profileForm}</div> },
                { id: "habitos", icon: "🔥", label: "Hábitos", node: <HabitsTracker initial={habitToday} streak={habitStreak} last7={last7} aguaObjetivo={profile?.water_target_l ?? null} pasosObjetivo={profile?.steps_target ?? null} /> },
                { id: "llamadas", icon: "📞", label: "Llamadas", node: (
                  <div className="card-dark p-6 !transform-none">
                    <h2 className="font-bold text-white mb-1">Mis llamadas estratégicas</h2>
                    <p className="text-xs text-[#666666] mb-4">
                      Aquí tienes la grabación de tus llamadas, para que puedas volver a verlas cuando quieras.
                    </p>
                    {calls.length === 0 ? (
                      <p className="text-sm text-[#666666]">
                        Todavía no hay ninguna. Cuando tu coach suba la grabación de tu llamada, aparecerá aquí.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {calls.map((c, i) => (
                          <div key={c.id} className={i > 0 ? "border-t border-[#252525] pt-4" : ""}>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {i === 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">La última</span>
                              )}
                              <span className="text-xs text-[#666666]">{callDay(c)}</span>
                            </div>
                            <p className="text-sm text-white font-bold mb-2">{c.title || DEFAULT_TITLE}</p>
                            <CallLink url={c.url} title={c.title || DEFAULT_TITLE} />
                            {c.note && (
                              <div className="mt-3 rounded-lg border border-[#1CA0E3]/30 bg-[#1CA0E3]/5 px-3 py-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1CA0E3] mb-1">Nota de tu coach</p>
                                <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{c.note}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) },
                { id: "contrato", icon: "📄", label: "Contrato", node: (
                  <div className="card-dark p-6 !transform-none">
                    <h2 className="font-bold text-white mb-3">Mis contratos firmados</h2>
                    {contratosFirmados.length === 0 ? (
                      <p className="text-sm text-[#666666]">Cuando firmes un contrato, aparecerá aquí para que puedas descargarlo.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {contratosFirmados.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#252525] px-4 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{c.title}</p>
                              <p className="text-xs text-[#666666]">Firmado el {new Date(c.signedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                            </div>
                            {c.url ? (
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm font-semibold shrink-0">Descargar</a>
                            ) : (
                              <span className="text-[#666666] text-xs shrink-0">No disponible</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) },
                { id: "ajustes", icon: "⚙️", label: "Ajustes", node: <div className="flex flex-col gap-6"><PushToggle /><PwaInstall /></div> },
              ]}
            />
          )}
        </div>
      </main>
    </>
  );
}
