import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import CallCountdown from "@/components/CallCountdown";
import { Barra, Fila, FilaAccion, Grupo, NotaCoach } from "@/components/Grupo";
import { adminEmails, isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { questionnaireComplete, type Questionnaire } from "@/lib/profile";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { periodoDe, proximaRevision, todayMadrid } from "@/lib/revisiones";
import { diaDe, fechaCorta, renovacionAlimentacion, renovacionEntrenamiento } from "@/lib/renovaciones";
import { miles } from "@/lib/suplementos";
import { rachaDias, semanaDe } from "@/lib/habitos";

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
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; note: string | null; created_at: string };
type Revision = { created_at: string; coach_reply: string | null; coach_reply_at: string | null };
type Habito = { day: string; steps: number | null };

/** «Viernes, 4 de septiembre», en horario de Madrid. */
function hoyLargo(): string {
  const s = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const fechaCortaDe = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/** Anillo con los días apuntados de la semana. */
function Anillo({ hechos, total }: { hechos: number; total: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const pct = total ? hechos / total : 0;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--c-warn) / 0.22)" strokeWidth="5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--c-warn))" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill="rgb(var(--c-warn))">{hechos}/{total}</text>
    </svg>
  );
}

export default async function MiembrosPage() {
  const email = await requireMember();
  const admin = isAdmin(email);
  const hoy = todayMadrid();
  const periodo = periodoDe(hoy);
  const e = encodeURIComponent(email);
  const desde = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const coachEmail = adminEmails()[0];

  // Todo lo de la clienta en una sola ida y vuelta. Cada consulta falla por su
  // cuenta: un fallo en una no deja la pantalla en blanco.
  const [profile, planes, revision, habitos, pendingDocs, coach] = await Promise.all([
    sbSelect<Profile>("profiles", `select=display_name,photo_path,questionnaire,steps_target&email=eq.${e}`)
      .then((r) => r[0] ?? null)
      .catch((err) => { console.error("[inicio] profile", err); return null; }),
    admin
      ? Promise.resolve([] as Plan[])
      : sbSelect<Plan>("plans", `select=id,type,title,note,created_at&member_email=eq.${e}&order=created_at.desc&limit=40`)
          .catch((err) => { console.error("[inicio] plans", err); return [] as Plan[]; }),
    admin
      ? Promise.resolve(null as Revision | null)
      : sbSelect<Revision>("check_ins", `select=created_at,coach_reply,coach_reply_at&member_email=eq.${e}&order=created_at.desc&limit=1`)
          .then((r) => r[0] ?? null)
          .catch((err) => { console.error("[inicio] check_ins", err); return null; }),
    admin
      ? Promise.resolve([] as Habito[])
      : sbSelect<Habito>("habit_logs", `select=day,steps&member_email=eq.${e}&day=gte.${desde}&order=day.asc`)
          .catch((err) => { console.error("[inicio] habits", err); return [] as Habito[]; }),
    // Las clientas exentas (las de antes) no quedan bloqueadas, así que si la
    // coach les asigna un contrato hay que avisarlas aquí de forma visible.
    admin
      ? Promise.resolve(0)
      : sbSelect<{ id: string }>("contract_assignments", `select=id&member_email=eq.${e}&status=eq.pendiente`)
          .then((r) => r.length).catch(() => 0),
    coachEmail
      ? sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(coachEmail)}`)
          .then((r) => r[0]?.display_name ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);

  const name = profile?.display_name || email.split("@")[0];
  const photoUrl = profile?.photo_path ? await sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : undefined;
  const inicialCoach = (coach || "C").trim().charAt(0).toUpperCase();

  // ---- Constancia ----------------------------------------------------------
  const dias = new Set(habitos.map((h) => h.day));
  const semana = semanaDe(hoy, dias);
  const hechosSemana = semana.filter((d) => d.done).length;
  const racha = rachaDias(dias, hoy);
  const hoyApuntado = dias.has(hoy);
  const constancia = racha >= 2
    ? { t: `Llevas ${racha} días seguidos cuidándote`, s: hechosSemana >= 4 ? `${hechosSemana} de 7 esta semana. Vas muy bien.` : `${hechosSemana} de 7 esta semana. Sigue así.` }
    : hoyApuntado
      ? { t: "Hoy ya has apuntado tu día", s: "Mañana, otra vez. Así se hace la constancia." }
      : hechosSemana > 0
        ? { t: "Apunta tu día en un minuto", s: `Llevas ${hechosSemana} de 7 esta semana.` }
        : { t: "Apunta tu día en un minuto", s: "Agua, pasos y sueño. Es lo que te hace constante." };

  // ---- Lo de hoy -----------------------------------------------------------
  const hechaEstaQuincena = !!revision && diaDe(revision.created_at) >= periodo.inicio;
  const prox = proximaRevision(hoy, hechaEstaQuincena);
  const pasosHoy = habitos.find((h) => h.day === hoy)?.steps ?? null;
  const pasosObjetivo = profile?.steps_target ?? null;

  // ---- Planes vigentes -----------------------------------------------------
  const nut = planes.find((p) => p.type === "nutricion") ?? null;
  const ent = planes.find((p) => p.type === "entrenamiento") ?? null;
  const renNut = renovacionAlimentacion(nut ? diaDe(nut.created_at) : null, hoy);
  const renEnt = renovacionEntrenamiento(ent ? diaDe(ent.created_at) : null, hoy);

  // ---- De tu coach: lo último que le ha escrito ----------------------------
  const notaCoach = revision?.coach_reply
    ? { texto: revision.coach_reply, fecha: fechaCortaDe(revision.coach_reply_at ?? revision.created_at), href: "/miembros/checkins" }
    : (nut?.note || ent?.note)
      ? { texto: (nut?.note || ent?.note) as string, fecha: fechaCortaDe((nut?.note ? nut : ent)!.created_at), href: "/miembros/perfil" }
      : null;

  // ---- Primeros pasos ------------------------------------------------------
  const quesDone = questionnaireComplete(profile?.questionnaire ?? {});
  const pasos = [
    { label: "Sube tu foto de perfil", done: !!profile?.photo_path, href: "/miembros/perfil?tab=cuestionario" },
    { label: "Completa tu cuestionario", done: quesDone, href: "/miembros/perfil?tab=cuestionario" },
    { label: "Haz tu primera revisión", done: !!revision, href: "/miembros/checkins" },
  ];
  const hechos = pasos.filter((s) => s.done).length;
  const showChecklist = !admin && hechos < pasos.length;

  // Una sola acción principal. Lo más urgente primero: la revisión que falta;
  // si está, apuntar el día; si también, mirar cómo va.
  const accion = prox.pendiente
    ? { href: "/miembros/checkins", label: "Subir mi revisión" }
    : !hoyApuntado
      ? { href: "/miembros/perfil?tab=habitos", label: "Apuntar mi día" }
      : { href: "/miembros/checkins", label: "Ver cómo voy" };

  const cabecera = (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink-muted uppercase tracking-wide">{hoyLargo()}</p>
        <h1 className="page-title truncate">Hola, {name}</h1>
      </div>
      <Link href="/miembros/perfil" aria-label="Mi perfil" className="w-10 h-10 mb-1 rounded-full overflow-hidden bg-warn-soft flex items-center justify-center shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[15px] font-semibold text-warn">{name.charAt(0).toUpperCase()}</span>
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
            <Grupo label="Tu trabajo">
              <Fila href="/miembros/admin" titulo="Panel de la coach" sub="Comunicados, plantillas y administración" />
              <Fila href="/miembros/clientas" titulo="Clientas" sub="Fichas, planes y renovaciones" />
              <Fila href="/miembros/checkins" titulo="Revisiones" sub={`Revisión del ${periodo.etiqueta}`} />
              <Fila href="/miembros/dudas" titulo="Dudas" sub="Lo que no se atreven a preguntar en la llamada" />
            </Grupo>
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
            <div className="rounded-[14px] bg-warn-soft px-4 py-3.5 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-warn">
                  Tienes {pendingDocs} documento{pendingDocs === 1 ? "" : "s"} pendiente{pendingDocs === 1 ? "" : "s"} de firma
                </p>
                <p className="text-[13px] text-warn/90">Solo te llevará un par de minutos.</p>
              </div>
              <Link href="/miembros/contrato" className="btn-brand text-sm px-4 !min-h-[40px] shrink-0">Rellenar y firmar</Link>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 lg:items-start">
            <div className="flex flex-col gap-5 min-w-0">
              {/* Constancia: lo primero que ve */}
              <Link href="/miembros/perfil?tab=habitos" className="flex items-center gap-3.5 rounded-[14px] bg-warn-soft px-4 py-3.5">
                <Anillo hechos={hechosSemana} total={7} />
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-ink leading-snug">{constancia.t}</p>
                  <p className="text-[14px] text-warn">{constancia.s}</p>
                </div>
              </Link>

              {/* Lo de hoy */}
              <Grupo label="Hoy">
                <Fila href="/miembros/checkins" titulo="Tu próxima revisión" sub={fechaCorta(prox.fecha)}
                  detalle={prox.pendiente ? (periodo.dia === 0 ? "hoy" : "sin subir") : prox.dias === 1 ? "mañana" : `en ${prox.dias} días`}
                  tono={prox.pendiente ? "warn" : "muted"} />
                <CallCountdown variant="fila" callUrl={process.env.CALL_URL ?? process.env.NEXT_PUBLIC_CALL_URL ?? ""} />
                <Link href="/miembros/perfil?tab=habitos" className="block px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-[17px]">
                    <span className="text-ink">Pasos</span>
                    {pasosHoy != null ? (
                      <span className="text-ink-subtle"><span className="text-ink">{miles(pasosHoy)}</span>{pasosObjetivo ? ` de ${miles(pasosObjetivo)}` : ""}</span>
                    ) : (
                      <span className="text-brand">Apuntar</span>
                    )}
                  </div>
                  {pasosObjetivo ? <Barra pct={pasosHoy != null ? (pasosHoy / pasosObjetivo) * 100 : 0} className="mt-2" /> : null}
                </Link>
              </Grupo>

              {/* Acción principal */}
              <Link href={accion.href} className="btn-brand text-[17px] w-full !min-h-[50px]">{accion.label}</Link>

              {/* Primeros pasos (desaparece al completarse) */}
              {showChecklist && (
                <Grupo label="Primeros pasos" foot={`${hechos} de ${pasos.length} hechos.`}>
                  {pasos.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-3 min-h-[46px] px-4 py-2 text-[17px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center ${s.done ? "bg-success" : "border-[1.5px] border-line-strong"}`}>
                          {s.done && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                        </span>
                        <span className={s.done ? "text-ink-subtle line-through" : "text-ink"}>{s.label}</span>
                      </div>
                      {!s.done && <Link href={s.href} className="text-brand shrink-0">Hacerlo</Link>}
                    </div>
                  ))}
                </Grupo>
              )}
            </div>

            <div className="flex flex-col gap-5 min-w-0">
              {notaCoach && (
                <Grupo label="De tu coach">
                  <NotaCoach texto={notaCoach.texto} inicial={inicialCoach} fecha={notaCoach.fecha} />
                  <FilaAccion><Link href={notaCoach.href}>Ver</Link></FilaAccion>
                </Grupo>
              )}

              <Grupo label="Tus planes">
                <Fila href="/miembros/perfil" titulo={nut?.title?.trim() || "Alimentación"}
                  sub={nut ? (renNut.toca ? `Se renueva el ${fechaCorta(renNut.toca)}` : undefined) : "Tu coach aún no lo ha subido"} />
                <Fila href="/miembros/perfil" titulo={ent?.title?.trim() ? `Entrenamiento · ${ent.title.trim()}` : "Entrenamiento"}
                  sub={ent ? (renEnt.toca ? `Vigente hasta el ${fechaCorta(renEnt.toca)}` : undefined) : "Tu coach aún no lo ha subido"} />
              </Grupo>

              <Grupo label="Más">
                <Fila href="/miembros/tecnica" titulo="Revisión de técnica" sub="Sube un vídeo y tu coach te corrige" />
                <Fila href="/miembros/dudas" titulo="Dudas" sub="Pregunta sin dar la cara" />
                <Fila href="/miembros/herramientas" titulo="Herramientas" sub="Qué pedir fuera, cómo hacer un ejercicio…" />
              </Grupo>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
