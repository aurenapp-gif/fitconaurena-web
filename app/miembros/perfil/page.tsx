import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import ProfileForm from "@/components/ProfileForm";
import PushToggle from "@/components/PushToggle";
import PwaInstall from "@/components/PwaInstall";
import PerfilTabs from "@/components/PerfilTabs";
import HabitsTracker, { type DiaSemana } from "@/components/HabitsTracker";
import FileViewer from "@/components/FileViewer";
import CallLink from "@/components/CallLink";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { callDay, DEFAULT_TITLE, type MemberCall } from "@/lib/llamadas";
import { litros, pasos, pauta, type Supplement } from "@/lib/suplementos";
import { diaDe, fechaCorta, hoyMadrid, renovacionAlimentacion, renovacionEntrenamiento, type Renovacion } from "@/lib/renovaciones";
import type { Questionnaire } from "@/lib/profile";
import { CONTRACT_BUCKET, type ContractSignature, type ContractTemplate } from "@/lib/contract";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null; questionnaire_completed_at: string | null; water_target_l?: number | null; steps_target?: number | null };
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; note?: string | null; file_path: string; created_at: string };
type HabitRow = { day: string; water: number | null; steps: number | null; sleep: number | null };

const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/**
 * Los planes de un tipo: el vigente en grande, con su fecha y hasta cuándo
 * vale; los anteriores plegados debajo, que casi nunca hacen falta pero no
 * deben perderse.
 */
function BloquePlan({ etiqueta, items, label, vacio, fallo, renovacion }: {
  etiqueta: string;
  items: (Plan & { url?: string })[];
  label: string;
  vacio: string;
  fallo?: boolean;
  renovacion: Renovacion;
}) {
  const actual = items[0];
  const anteriores = items.slice(1);
  return (
    <section className="flex flex-col gap-2" aria-label={etiqueta}>
      <p className="text-[11.5px] font-bold text-ink-muted tracking-wide px-0.5">{etiqueta}</p>
      <div className="card-dark !p-4 !transform-none flex flex-col gap-3">
        {fallo ? (
          // Decirle «tu coach aún no ha subido tu plan» cuando lo que ha pasado
          // es que no se ha podido consultar sería el peor error posible aquí.
          <p role="alert" className="text-sm text-danger">
            No hemos podido cargar tus planes ahora mismo. Vuelve a entrar en un momento: no se ha perdido nada.
          </p>
        ) : !actual ? (
          <p className="text-sm text-ink-subtle">{vacio}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10.5px] font-extrabold px-2 py-[3px] rounded-full bg-brand text-white shrink-0">Actual</span>
                <span className="text-xs text-ink-muted truncate">{fechaLarga(actual.created_at)}</span>
              </div>
              {renovacion.toca && (
                <span className="text-xs font-bold text-ink-muted shrink-0">
                  {renovacion.dias != null && renovacion.dias < 0 ? "pendiente de renovar" : `hasta el ${fechaCorta(renovacion.toca)}`}
                </span>
              )}
            </div>
            <p className="text-[15px] font-extrabold text-ink tracking-tight leading-snug">{actual.title?.trim() || label}</p>
            {actual.note && (
              <div className="flex gap-2.5 rounded-[10px] bg-brand-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink">
                <span className="w-[3px] rounded-full bg-brand shrink-0" aria-hidden="true" />
                <p className="whitespace-pre-wrap"><span className="font-bold">Nota de tu coach:</span> {actual.note}</p>
              </div>
            )}
            {actual.url ? (
              <FileViewer url={actual.url} label={label} buttonText="Ver plan" ancho />
            ) : (
              <p className="text-sm text-ink-subtle">No disponible ahora mismo. Vuelve a entrar en un momento.</p>
            )}
            {anteriores.length > 0 && (
              <details className="group border-t border-line pt-1">
                <summary className="flex items-center justify-between min-h-[40px] cursor-pointer list-none text-[13px] font-bold text-ink-muted [&::-webkit-details-marker]:hidden">
                  <span className="shrink-0 whitespace-nowrap">Anteriores ({anteriores.length})</span>
                  <span className="truncate ml-3 text-right font-semibold text-ink-subtle group-open:hidden">
                    {anteriores.map((p) => p.title?.trim() || fechaLarga(p.created_at)).join(" · ")}
                  </span>
                  <span className="hidden group-open:inline text-ink-subtle">Ocultar</span>
                </summary>
                <div className="flex flex-col divide-y divide-line">
                  {anteriores.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{p.title?.trim() || label}</p>
                        <p className="text-xs text-ink-subtle">{fechaLarga(p.created_at)}</p>
                      </div>
                      {p.url ? (
                        <div className="flex items-center gap-3 shrink-0">
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-brand text-sm font-semibold min-h-[40px] inline-flex items-center">Ver</a>
                          <a href={`${p.url}${p.url.includes("?") ? "&" : "?"}download`} className="text-ink-muted text-sm font-semibold min-h-[40px] inline-flex items-center">Descargar</a>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-subtle shrink-0">No disponible</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Lunes a domingo de la semana en curso, marcando los días con registro. */
function semanaDe(today: string, registrados: Set<string>): DiaSemana[] {
  const d = new Date(today + "T00:00:00Z");
  const lunes = new Date(d);
  lunes.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return ["L", "M", "X", "J", "V", "S", "D"].map((label, i) => {
    const x = new Date(lunes);
    x.setUTCDate(lunes.getUTCDate() + i);
    const ds = x.toISOString().slice(0, 10);
    return { label, done: registrados.has(ds), hoy: ds === today, futuro: ds > today };
  });
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

export default async function PerfilPage({ searchParams }: { searchParams?: { tab?: string } }) {
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
  const hoy = hoyMadrid();
  const renNut = renovacionAlimentacion(nutPlans[0] ? diaDe(nutPlans[0].created_at) : null, hoy);
  const renEnt = renovacionEntrenamiento(entPlans[0] ? diaDe(entPlans[0].created_at) : null, hoy);

  const loggedDays = new Set(habitRows.map((r) => r.day));
  const todayRow = habitRows.find((r) => r.day === hoy);
  const habitToday = { water: todayRow?.water ?? null, steps: todayRow?.steps ?? null, sleep: todayRow?.sleep ?? null };
  const habitStreak = dayStreak(loggedDays, hoy);
  const semana = semanaDe(hoy, loggedDays);

  const agua = profile?.water_target_l ?? null;
  const pasosObj = profile?.steps_target ?? null;

  const planesTab = (
    <div className="flex flex-col gap-4">
      <BloquePlan etiqueta="Nutrición" items={nutPlans} label="Plan de nutrición" vacio="Tu coach aún no ha subido tu plan de nutrición." fallo={planesFallo} renovacion={renNut} />
      <BloquePlan etiqueta="Entrenamiento" items={entPlans} label="Plan de entrenamiento" vacio="Tu coach aún no ha subido tu plan de entrenamiento." fallo={planesFallo} renovacion={renEnt} />

      {/* Pauta diaria: agua, pasos y suplementación. */}
      <section className="flex flex-col gap-2" aria-label="Agua, pasos y suplementación">
        <p className="text-[11.5px] font-bold text-ink-muted tracking-wide px-0.5">Agua, pasos y suplementación</p>
        <div className="card-dark !py-1 !px-4 !transform-none divide-y divide-line">
          <div className="flex items-center justify-between gap-3 min-h-[48px] text-sm">
            <span className="font-bold text-ink">Agua</span>
            <span className="text-ink-muted">{agua != null ? `${litros(agua)} al día` : "Sin pauta todavía"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 min-h-[48px] text-sm">
            <span className="font-bold text-ink">Pasos</span>
            <span className="text-ink-muted">{pasosObj != null ? `${pasos(pasosObj)} al día` : "Sin pauta todavía"}</span>
          </div>
          {supplements.length === 0 ? (
            <div className="flex items-center justify-between gap-3 min-h-[48px] text-sm">
              <span className="font-bold text-ink">Suplementos</span>
              <span className="text-ink-muted">Ninguno pautado</span>
            </div>
          ) : (
            supplements.map((s) => (
              <div key={s.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{s.name}</span>
                    {pauta(s) && <span className="block text-xs text-ink-muted mt-0.5">{pauta(s)}</span>}
                  </span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand text-sm font-semibold shrink-0">Comprarlo</a>
                  )}
                </div>
                {s.note && <p className="text-xs text-ink-muted mt-1.5 whitespace-pre-wrap">{s.note}</p>}
              </div>
            ))
          )}
        </div>
        {supplements.length > 0 && (
          <p className="text-xs text-ink-subtle px-0.5">Lo que te ha pautado tu coach. Si tienes dudas, pregúntale antes de cambiar nada.</p>
        )}
      </section>
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
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <h1 className="text-[26px] lg:text-3xl font-extrabold text-ink tracking-tight leading-tight mb-4">Mi perfil</h1>

          {admin ? (
            profileForm
          ) : (
            <PerfilTabs
              initial={searchParams?.tab}
              tabs={[
                { id: "planes", label: "Planes", node: planesTab },
                { id: "habitos", label: "Hábitos", node: <HabitsTracker initial={habitToday} streak={habitStreak} semana={semana} aguaObjetivo={agua} pasosObjetivo={pasosObj} /> },
                { id: "cuestionario", label: "Datos", node: (
                  <div className="flex flex-col gap-6">
                    {profileForm}
                    <section aria-label="Ajustes" className="flex flex-col gap-2">
                      <p className="text-[11.5px] font-bold text-ink-muted tracking-wide px-0.5">Ajustes</p>
                      <div className="flex flex-col gap-4"><PushToggle /><PwaInstall /></div>
                    </section>
                  </div>
                ) },
                { id: "llamadas", label: "Llamadas", node: (
                  <div className="card-dark !p-4 !transform-none">
                    <h2 className="text-sm font-extrabold text-ink mb-1">Mis llamadas estratégicas</h2>
                    <p className="text-xs text-ink-subtle mb-4">
                      Aquí tienes la grabación de tus llamadas, para que puedas volver a verlas cuando quieras.
                    </p>
                    {calls.length === 0 ? (
                      <p className="text-sm text-ink-subtle">
                        Todavía no hay ninguna. Cuando tu coach suba la grabación de tu llamada, aparecerá aquí.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {calls.map((c, i) => (
                          <div key={c.id} className={i > 0 ? "border-t border-line pt-4" : ""}>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {i === 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand text-white">La última</span>
                              )}
                              <span className="text-xs text-ink-subtle">{callDay(c)}</span>
                            </div>
                            <p className="text-sm text-ink font-bold mb-2">{c.title || DEFAULT_TITLE}</p>
                            <CallLink url={c.url} title={c.title || DEFAULT_TITLE} />
                            {c.note && (
                              <div className="mt-3 flex gap-2.5 rounded-[10px] bg-brand-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink">
                                <span className="w-[3px] rounded-full bg-brand shrink-0" aria-hidden="true" />
                                <p className="whitespace-pre-wrap"><span className="font-bold">Nota de tu coach:</span> {c.note}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) },
                { id: "contrato", label: "Contratos", node: (
                  <div className="card-dark !p-4 !transform-none">
                    <h2 className="text-sm font-extrabold text-ink mb-3">Mis contratos firmados</h2>
                    {contratosFirmados.length === 0 ? (
                      <p className="text-sm text-ink-subtle">Cuando firmes un contrato, aparecerá aquí para que puedas descargarlo.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {contratosFirmados.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 min-h-[56px]">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-ink truncate">{c.title}</p>
                              <p className="text-xs text-ink-subtle">Firmado el {new Date(c.signedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                            </div>
                            {c.url ? (
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="min-h-[40px] inline-flex items-center text-brand text-sm font-semibold shrink-0">Descargar</a>
                            ) : (
                              <span className="text-ink-subtle text-xs shrink-0">No disponible</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) },
              ]}
            />
          )}
        </div>
      </main>
    </>
  );
}
