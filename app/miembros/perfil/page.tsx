import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import ProfileForm from "@/components/ProfileForm";
import PushToggle from "@/components/PushToggle";
import PwaInstall from "@/components/PwaInstall";
import PerfilTabs from "@/components/PerfilTabs";
import HabitsTracker from "@/components/HabitsTracker";
import FileViewer from "@/components/FileViewer";
import CallLink from "@/components/CallLink";
import PesoToggle from "@/components/PesoToggle";
import { Fila, FilaAccion, Grupo, NotaCoach } from "@/components/Grupo";
import { adminEmails, isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { callDay, DEFAULT_TITLE, type MemberCall } from "@/lib/llamadas";
import { litros, pasos, pauta, type Supplement } from "@/lib/suplementos";
import { diaDe, fechaCorta, hoyMadrid, renovacionAlimentacion, renovacionEntrenamiento, type Renovacion } from "@/lib/renovaciones";
import { rachaDias, semanaDe } from "@/lib/habitos";
import { nombresDe } from "@/lib/entreno";
import type { Questionnaire } from "@/lib/profile";
import { CONTRACT_BUCKET, type ContractSignature, type ContractTemplate } from "@/lib/contract";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null; questionnaire_completed_at: string | null; water_target_l?: number | null; steps_target?: number | null; hide_weight?: boolean | null };
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; note?: string | null; file_path: string; created_at: string; exercises?: unknown };
type HabitRow = { day: string; water: number | null; steps: number | null; sleep: number | null; cycle_day?: number | null; energy?: number | null };

const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/**
 * Los planes de un tipo: el vigente con su fecha, hasta cuándo vale y la nota
 * de la coach; los anteriores plegados debajo.
 */
function BloquePlan({ etiqueta, items, label, vacio, fallo, renovacion, inicialCoach }: {
  etiqueta: string;
  items: (Plan & { url?: string })[];
  label: string;
  vacio: string;
  fallo?: boolean;
  renovacion: Renovacion;
  inicialCoach: string;
}) {
  const actual = items[0];
  const anteriores = items.slice(1);
  const ejercicios = actual ? nombresDe(actual.exercises) : [];
  return (
    <Grupo label={etiqueta}>
      {fallo ? (
        // Decirle «tu coach aún no ha subido tu plan» cuando lo que ha pasado
        // es que no se ha podido consultar sería el peor error posible aquí.
        <p role="alert" className="px-4 py-3 text-[15px] text-danger">
          No hemos podido cargar tus planes ahora mismo. Vuelve a entrar en un momento: no se ha perdido nada.
        </p>
      ) : !actual ? (
        <p className="px-4 py-3 text-[15px] text-ink-muted">{vacio}</p>
      ) : (
        <>
          <Fila
            titulo={actual.title?.trim() || label}
            sub={`Desde el ${fechaLarga(actual.created_at)}${renovacion.toca ? (renovacion.dias != null && renovacion.dias < 0 ? " · pendiente de renovar" : ` · hasta el ${fechaCorta(renovacion.toca)}`) : ""}`}
          />
          {actual.note && <NotaCoach texto={actual.note} inicial={inicialCoach} />}
          {ejercicios.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[13px] text-ink-muted mb-1">Ejercicios que apuntarás en cada revisión</p>
              <p className="text-[15px] text-ink leading-5">{ejercicios.join(" · ")}</p>
            </div>
          )}
          {actual.url ? (
            <FileViewer url={actual.url} label={label} buttonText="Abrir mi plan" fila />
          ) : (
            <p className="px-4 py-3 text-[15px] text-ink-muted">No disponible ahora mismo. Vuelve a entrar en un momento.</p>
          )}
          {anteriores.length > 0 && (
            <details className="group">
              <summary className="flex items-center justify-between gap-3 min-h-[46px] px-4 py-2 cursor-pointer list-none text-[17px] text-ink [&::-webkit-details-marker]:hidden">
                <span>Anteriores</span>
                <span className="flex items-center gap-2 text-ink-subtle">{anteriores.length}<svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90 text-line-strong" aria-hidden="true"><path d="M1 1l6 6-6 6" /></svg></span>
              </summary>
              <div className="flex flex-col divide-y divide-line border-t border-line">
                {anteriores.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 min-h-[46px]">
                    <div className="min-w-0">
                      <p className="text-[15px] text-ink truncate">{p.title?.trim() || label}</p>
                      <p className="text-[13px] text-ink-muted">{fechaLarga(p.created_at)}</p>
                    </div>
                    {p.url ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-brand text-[15px] min-h-[40px] inline-flex items-center">Ver</a>
                        <a href={`${p.url}${p.url.includes("?") ? "&" : "?"}download`} className="text-ink-muted text-[15px] min-h-[40px] inline-flex items-center">Descargar</a>
                      </div>
                    ) : (
                      <span className="text-[13px] text-ink-subtle shrink-0">No disponible</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </Grupo>
  );
}

export default async function PerfilPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const email = await requireMember();
  const admin = isAdmin(email);
  const coachEmail = adminEmails()[0];

  const since = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);

  // 1ª tanda: todo lo independiente en paralelo (una sola ida/vuelta, no en cascada).
  const [profile, plans, habitRows, signatures, calls, supplements, coach] = await Promise.all([
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
          `select=*&member_email=eq.${encodeURIComponent(email)}&day=gte.${since}&order=day.asc`
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
    coachEmail
      ? sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(coachEmail)}`)
          .then((r) => r[0]?.display_name ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);
  const inicialCoach = (coach || "C").trim().charAt(0).toUpperCase();

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
  const habitToday = { water: todayRow?.water ?? null, steps: todayRow?.steps ?? null, sleep: todayRow?.sleep ?? null, cycle_day: todayRow?.cycle_day ?? null, energy: todayRow?.energy ?? null };
  const habitStreak = rachaDias(loggedDays, hoy);
  const semana = semanaDe(hoy, loggedDays);

  const agua = profile?.water_target_l ?? null;
  const pasosObj = profile?.steps_target ?? null;

  const planesTab = (
    <div className="flex flex-col gap-5">
      <BloquePlan etiqueta="Tu alimentación" items={nutPlans} label="Plan de alimentación" vacio="Tu coach aún no ha subido tu plan de alimentación." fallo={planesFallo} renovacion={renNut} inicialCoach={inicialCoach} />
      <BloquePlan etiqueta="Tu entrenamiento" items={entPlans} label="Plan de entrenamiento" vacio="Tu coach aún no ha subido tu plan de entrenamiento." fallo={planesFallo} renovacion={renEnt} inicialCoach={inicialCoach} />

      {/* Pauta diaria: agua, pasos y suplementación. */}
      <Grupo label="Cada día" foot={supplements.length > 0 ? "Lo que te ha pautado tu coach. Si tienes dudas, pregúntale antes de cambiar nada." : undefined}>
        <Fila titulo="Agua" detalle={agua != null ? `${litros(agua)} al día` : "Sin pauta todavía"} />
        <Fila titulo="Pasos" detalle={pasosObj != null ? `${pasos(pasosObj)} al día` : "Sin pauta todavía"} />
        {supplements.length === 0 ? (
          <Fila titulo="Suplementos" detalle="Ninguno pautado" />
        ) : (
          supplements.map((s) => (
            <div key={s.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[17px] text-ink">{s.name}</span>
                  {pauta(s) && <span className="block text-[15px] text-ink-muted mt-px">{pauta(s)}</span>}
                </span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand text-[15px] shrink-0 min-h-[40px] inline-flex items-center">Comprarlo</a>
                )}
              </div>
              {s.note && <p className="text-[13px] text-ink-muted mt-1.5 whitespace-pre-wrap">{s.note}</p>}
            </div>
          ))
        )}
      </Grupo>
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
          <h1 className="page-title mb-4">Mi perfil</h1>

          {admin ? (
            profileForm
          ) : (
            <PerfilTabs
              initial={searchParams?.tab}
              tabs={[
                { id: "planes", label: "Planes", node: planesTab },
                { id: "habitos", label: "Hábitos", node: <HabitsTracker initial={habitToday} streak={habitStreak} semana={semana} aguaObjetivo={agua} pasosObjetivo={pasosObj} /> },
                { id: "cuestionario", label: "Datos", node: (
                  <div className="flex flex-col gap-5">
                    {profileForm}
                    <Grupo label="Ajustes">
                      <PesoToggle initial={!!profile?.hide_weight} />
                      <div className="px-4 py-3"><PushToggle /></div>
                      <div className="px-4 py-3"><PwaInstall /></div>
                    </Grupo>
                  </div>
                ) },
                { id: "llamadas", label: "Llamadas", node: (
                  <Grupo label="Mis llamadas estratégicas" foot="Aquí tienes la grabación de tus llamadas, para que puedas volver a verlas cuando quieras.">
                    {calls.length === 0 ? (
                      <p className="px-4 py-3 text-[15px] text-ink-muted">
                        Todavía no hay ninguna. Cuando tu coach suba la grabación de tu llamada, aparecerá aquí.
                      </p>
                    ) : (
                      calls.map((c, i) => (
                        <div key={c.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {i === 0 && <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success">La última</span>}
                            <span className="text-[13px] text-ink-muted">{callDay(c)}</span>
                          </div>
                          <p className="text-[17px] text-ink mb-2">{c.title || DEFAULT_TITLE}</p>
                          <CallLink url={c.url} title={c.title || DEFAULT_TITLE} />
                          {c.note && <div className="-mx-4 mt-2"><NotaCoach texto={c.note} inicial={inicialCoach} /></div>}
                        </div>
                      ))
                    )}
                  </Grupo>
                ) },
                { id: "contrato", label: "Contratos", node: (
                  <Grupo label="Mis contratos firmados">
                    {contratosFirmados.length === 0 ? (
                      <p className="px-4 py-3 text-[15px] text-ink-muted">Cuando firmes un contrato, aparecerá aquí para que puedas descargarlo.</p>
                    ) : (
                      contratosFirmados.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 min-h-[46px]">
                          <div className="min-w-0">
                            <p className="text-[17px] text-ink truncate">{c.title}</p>
                            <p className="text-[13px] text-ink-muted">Firmado el {new Date(c.signedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                          </div>
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-brand text-[15px] shrink-0 min-h-[40px] inline-flex items-center">Descargar</a>
                          ) : (
                            <span className="text-ink-subtle text-[13px] shrink-0">No disponible</span>
                          )}
                        </div>
                      ))
                    )}
                  </Grupo>
                ) },
              ]}
            />
          )}
        </div>
      </main>
    </>
  );
}
