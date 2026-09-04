import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import CallCountdown from "@/components/CallCountdown";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { questionnaireComplete, type Questionnaire } from "@/lib/profile";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { periodoDe, proximaRevision, todayMadrid } from "@/lib/revisiones";
import { diaDe, fechaCorta, renovacionAlimentacion, renovacionEntrenamiento } from "@/lib/renovaciones";
import { miles } from "@/lib/suplementos";

export const metadata: Metadata = {
  title: "Área de miembros",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Profile = {
  display_name: string | null;
  photo_path: string | null;
  questionnaire: Questionnaire | null;
  steps_target?: number | null;
};
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; created_at: string };

/** «Jueves, 4 de septiembre», en horario de Madrid. */
function hoyLargo(): string {
  const s = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Flecha() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-subtle shrink-0">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** Fila de tarjeta que lleva a otra pantalla: título, detalle y flecha. */
function FilaEnlace({ href, titulo, detalle }: { href: string; titulo: string; detalle?: string }) {
  return (
    <Link href={href} className="card-dark !p-0 !transform-none flex items-center justify-between gap-3 px-4 min-h-[60px] min-w-0 hover:border-brand/40 transition-colors">
      <div className="min-w-0 py-3">
        <p className="text-sm font-bold text-ink truncate">{titulo}</p>
        {detalle && <p className="text-xs text-ink-muted truncate">{detalle}</p>}
      </div>
      <Flecha />
    </Link>
  );
}

export default async function MiembrosPage() {
  const email = await requireMember();
  const admin = isAdmin(email);
  const hoy = todayMadrid();
  const periodo = periodoDe(hoy);
  const e = encodeURIComponent(email);

  // Todo lo de la clienta en una sola ida y vuelta. Cada consulta falla por su
  // cuenta: un fallo en una no deja la pantalla en blanco.
  const [profile, planes, ultimaRevision, habitosHoy, pendingDocs] = await Promise.all([
    sbSelect<Profile>("profiles", `select=display_name,photo_path,questionnaire,steps_target&email=eq.${e}`)
      .then((r) => r[0] ?? null)
      .catch((err) => { console.error("[inicio] profile", err); return null; }),
    admin
      ? Promise.resolve([] as Plan[])
      : sbSelect<Plan>("plans", `select=id,type,title,created_at&member_email=eq.${e}&order=created_at.desc&limit=40`)
          .catch((err) => { console.error("[inicio] plans", err); return [] as Plan[]; }),
    admin
      ? Promise.resolve(null as string | null)
      : sbSelect<{ created_at: string }>("check_ins", `select=created_at&member_email=eq.${e}&order=created_at.desc&limit=1`)
          .then((r) => r[0]?.created_at ?? null)
          .catch((err) => { console.error("[inicio] check_ins", err); return null; }),
    admin
      ? Promise.resolve(null as { steps: number | null } | null)
      : sbSelect<{ steps: number | null }>("habit_logs", `select=steps&member_email=eq.${e}&day=eq.${hoy}`)
          .then((r) => r[0] ?? null)
          .catch((err) => { console.error("[inicio] habits", err); return null; }),
    // Las clientas exentas (las de antes) no quedan bloqueadas, así que si la
    // coach les asigna un contrato hay que avisarlas aquí de forma visible.
    admin
      ? Promise.resolve(0)
      : sbSelect<{ id: string }>("contract_assignments", `select=id&member_email=eq.${e}&status=eq.pendiente`)
          .then((r) => r.length).catch(() => 0),
  ]);

  const name = profile?.display_name || email.split("@")[0];
  const photoUrl = profile?.photo_path ? await sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : undefined;

  // ---- Lo de hoy -----------------------------------------------------------
  const hechaEstaQuincena = !!ultimaRevision && diaDe(ultimaRevision) >= periodo.inicio;
  const revision = proximaRevision(hoy, hechaEstaQuincena);
  const pasosHoy = habitosHoy?.steps ?? null;
  const pasosObjetivo = profile?.steps_target ?? null;
  const pasosPct = pasosHoy != null && pasosObjetivo ? Math.min(100, Math.round((pasosHoy / pasosObjetivo) * 100)) : 0;

  // ---- Planes vigentes -----------------------------------------------------
  const nut = planes.find((p) => p.type === "nutricion") ?? null;
  const ent = planes.find((p) => p.type === "entrenamiento") ?? null;
  const renNut = renovacionAlimentacion(nut ? diaDe(nut.created_at) : null, hoy);
  const renEnt = renovacionEntrenamiento(ent ? diaDe(ent.created_at) : null, hoy);

  // ---- Primeros pasos ------------------------------------------------------
  // Misma fuente de verdad que el formulario y la API (no duplicar la lista).
  const quesDone = questionnaireComplete(profile?.questionnaire ?? {});
  const steps = [
    { label: "Sube tu foto de perfil", done: !!profile?.photo_path, href: "/miembros/perfil?tab=cuestionario" },
    { label: "Completa tu cuestionario", done: quesDone, href: "/miembros/perfil?tab=cuestionario" },
    { label: "Haz tu primer check-in", done: !!ultimaRevision, href: "/miembros/checkins" },
  ];
  const hechos = steps.filter((s) => s.done).length;
  const showChecklist = !admin && hechos < steps.length;

  // Una sola acción principal. Lo más urgente primero: la revisión que falta;
  // si está, los hábitos de hoy; si también, mirar cómo va.
  const accion = revision.pendiente
    ? { href: "/miembros/checkins", label: "Subir check-in" }
    : habitosHoy === null
      ? { href: "/miembros/perfil?tab=habitos", label: "Registrar los hábitos de hoy" }
      : { href: "/miembros/checkins", label: "Ver mi progreso" };

  const cabecera = (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="min-w-0">
        <p className="text-[11.5px] font-bold text-ink-muted tracking-wide">{hoyLargo()}</p>
        <h1 className="text-[26px] lg:text-3xl font-extrabold text-ink tracking-tight leading-tight truncate">Hola, {name}</h1>
      </div>
      <Link href="/miembros/perfil" aria-label="Mi perfil" className="w-11 h-11 rounded-full overflow-hidden bg-brand-soft border border-line flex items-center justify-center shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[15px] font-extrabold text-brand">{name.charAt(0).toUpperCase()}</span>
        )}
      </Link>
    </div>
  );

  // ---- La coach: su inicio es un atajo a su trabajo ------------------------
  if (admin) {
    return (
      <>
        <AppShell admin />
        <main className="app-main relative min-h-screen">
          <div className="container-content relative z-10 py-6 lg:py-12">
            {cabecera}
            <div className="grid gap-3 sm:grid-cols-2">
              <FilaEnlace href="/miembros/admin" titulo="Panel de la coach" detalle="Comunicados, planes y todo lo de administración" />
              <FilaEnlace href="/miembros/clientas" titulo="Clientas" detalle="Fichas, planes y renovaciones" />
              <FilaEnlace href="/miembros/checkins" titulo="Check-ins" detalle={`Revisión del ${periodo.etiqueta}`} />
              <FilaEnlace href="/miembros/dudas" titulo="Dudas" detalle="Lo que no se atreven a preguntar en la llamada" />
            </div>
            <div className="mt-5">
              <CallCountdown callUrl={process.env.CALL_URL ?? process.env.NEXT_PUBLIC_CALL_URL ?? ""} />
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          {cabecera}

          {/* Documentos pendientes de firma. Solo lo ven las clientas exentas:
              a las nuevas el guard ya las lleva directamente a firmarlos. */}
          {pendingDocs > 0 && (
            <div className="rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3.5 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-warn">
                  Tienes {pendingDocs} documento{pendingDocs === 1 ? "" : "s"} pendiente{pendingDocs === 1 ? "" : "s"} de firma
                </p>
                <p className="text-xs text-warn/90">Solo te llevará un par de minutos.</p>
              </div>
              <Link href="/miembros/contrato" className="btn-brand text-xs px-4 !min-h-[40px] shrink-0">Rellenar y firmar</Link>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
            <div className="flex flex-col gap-4 min-w-0">
              {/* Lo de hoy */}
              <section className="card-dark !py-1 !px-4 !transform-none divide-y divide-line" aria-label="Hoy">
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-bold text-ink-muted tracking-wide">Próxima revisión</p>
                    <p className="text-base font-extrabold text-ink tracking-tight">{fechaCorta(revision.fecha)}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${revision.pendiente ? "text-warn" : "text-ink-muted"}`}>
                    {revision.pendiente
                      ? periodo.dia === 0 ? "hoy toca" : "sin subir"
                      : revision.dias === 1 ? "mañana" : `en ${revision.dias} días`}
                  </span>
                </div>
                <CallCountdown variant="fila" callUrl={process.env.CALL_URL ?? process.env.NEXT_PUBLIC_CALL_URL ?? ""} />
                <Link href="/miembros/perfil?tab=habitos" className="block py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[11.5px] font-bold text-ink-muted tracking-wide">Pasos de hoy</p>
                    <p className="text-[13px] font-bold text-ink">
                      {pasosHoy != null ? (
                        <>
                          <span className="text-base font-extrabold">{miles(pasosHoy)}</span>
                          {pasosObjetivo ? <span className="text-ink-muted"> de {miles(pasosObjetivo)}</span> : null}
                        </>
                      ) : (
                        <span className="text-brand">Registrar</span>
                      )}
                    </p>
                  </div>
                  {pasosObjetivo ? (
                    <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pasosPct} aria-valuemin={0} aria-valuemax={100} aria-label="Pasos de hoy sobre el objetivo">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${pasosPct}%` }} />
                    </div>
                  ) : null}
                </Link>
              </section>

              {/* Acción principal */}
              <Link href={accion.href} className="btn-brand text-[15px] w-full !min-h-[50px]">{accion.label}</Link>

              {/* Primeros pasos (desaparece al completarse) */}
              {showChecklist && (
                <section className="card-dark !p-4 !transform-none" aria-label="Tus primeros pasos">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-extrabold text-ink">Tus primeros pasos</h2>
                    <span className="text-xs font-bold text-ink-muted">{hechos} de {steps.length}</span>
                  </div>
                  {steps.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-3 min-h-[44px] text-sm font-semibold">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center ${s.done ? "bg-brand" : "border-2 border-line-strong"}`}>
                          {s.done && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                        </span>
                        <span className={s.done ? "text-ink-subtle line-through" : "text-ink"}>{s.label}</span>
                      </div>
                      {!s.done && <Link href={s.href} className="text-brand text-[13px] font-bold shrink-0">Hacerlo</Link>}
                    </div>
                  ))}
                </section>
              )}
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              {/* Tus planes */}
              <section aria-label="Tus planes" className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-[15px] font-extrabold text-ink tracking-tight">Tus planes</h2>
                  <Link href="/miembros/perfil" className="text-[13px] font-bold text-brand">Ver todos</Link>
                </div>
                {nut ? (
                  <FilaEnlace
                    href="/miembros/perfil"
                    titulo={nut.title?.trim() || "Plan de nutrición"}
                    detalle={renNut.toca ? `Se renueva el ${fechaCorta(renNut.toca)}` : undefined}
                  />
                ) : (
                  <FilaEnlace href="/miembros/perfil" titulo="Plan de nutrición" detalle="Tu coach aún no lo ha subido" />
                )}
                {ent ? (
                  <FilaEnlace
                    href="/miembros/perfil"
                    titulo={ent.title?.trim() ? `Entrenamiento · ${ent.title.trim()}` : "Plan de entrenamiento"}
                    detalle={renEnt.toca ? `Vigente hasta el ${fechaCorta(renEnt.toca)}` : undefined}
                  />
                ) : (
                  <FilaEnlace href="/miembros/perfil" titulo="Plan de entrenamiento" detalle="Tu coach aún no lo ha subido" />
                )}
              </section>

              {/* Atajos a lo que no está en la barra */}
              <section aria-label="Más" className="flex flex-col gap-2">
                <h2 className="text-[15px] font-extrabold text-ink tracking-tight px-0.5">Más</h2>
                <FilaEnlace href="/miembros/tecnica" titulo="Revisión de técnica" detalle="Sube un vídeo y tu coach te corrige" />
                <FilaEnlace href="/miembros/dudas" titulo="Dudas" detalle="Pregunta sin dar la cara" />
                <FilaEnlace href="/miembros/herramientas" titulo="Herramientas" detalle="Qué pedir fuera, cómo hacer un ejercicio…" />
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
