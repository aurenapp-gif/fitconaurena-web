import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import PlanUpload from "@/components/PlanUpload";
import PlanDelete from "@/components/PlanDelete";
import RenewalSetter from "@/components/RenewalSetter";
import ServiceEndSetter from "@/components/ServiceEndSetter";
import RemoveClient from "@/components/RemoveClient";
import WeightChart from "@/components/WeightChart";
import ContractAssign from "@/components/ContractAssign";
import CallAdd from "@/components/CallAdd";
import CallDelete from "@/components/CallDelete";
import SetupSql from "@/components/SetupSql";
import SupplementPlan from "@/components/SupplementPlan";
import Renovaciones from "@/components/Renovaciones";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { callDay, DEFAULT_TITLE, SETUP_SQL as CALLS_SQL, type MemberCall } from "@/lib/llamadas";
import { type Supplement } from "@/lib/suplementos";
import { PROFILE_FIELDS, renewalInfo, serviceEndInfo, SERVICE_MONTHS, edadDe, fechaLarga, type Questionnaire } from "@/lib/profile";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbSignedUrl, isMissingTable } from "@/lib/supabase";
import { CONTRACT_BUCKET, type ContractTemplate, type ContractSignature, type ContractAssignment } from "@/lib/contract";
import { servicePct } from "@/lib/company";
import { renovacionAlimentacion, renovacionEntrenamiento, hoyMadrid, diaDe } from "@/lib/renovaciones";

export const metadata: Metadata = { title: "Clienta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = {
  email: string; display_name: string | null; photo_path: string | null;
  questionnaire: Questionnaire | null; renewal_date: string | null; service_ends_at?: string | null;
  created_at?: string | null; terms_accepted_at?: string | null; terms_version?: string | null;
  questionnaire_completed_at?: string | null;
  full_name?: string | null; address?: string | null; postal_code?: string | null;
  contracts_exempt?: boolean | null; water_target_l?: number | null; steps_target?: number | null;
};
type Plan = { id: string; type: string; title: string | null; note?: string | null; file_path: string; created_at: string };
type CheckIn = { weight: number | null; created_at: string };
type Activity = { action: string; detail: string | null; created_at: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}
/** Fecha y hora completas: es el formato que sirve como evidencia. */
function fmtFull(d: string) {
  return new Date(d).toLocaleString("es-ES", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}
/**
 * Fecha de nacimiento tal y como la ve la coach: la fecha exacta y, entre
 * paréntesis, la edad de hoy ya calculada (que es lo que antes se preguntaba).
 *
 * Las clientas que respondieron al cuestionario anterior solo tienen la edad
 * guardada, y de una edad no se puede deducir la fecha. A ellas se les sigue
 * mostrando lo que dijeron, marcado para que no se confunda con un dato exacto.
 */
function nacimientoTexto(q: Questionnaire): string {
  const fecha = fechaLarga(q.fecha_nacimiento);
  if (fecha) {
    const edad = edadDe(q.fecha_nacimiento);
    return edad === null ? fecha : `${fecha} · ${edad} años`;
  }
  const heredada = (q.edad ?? "").trim();
  if (heredada) return `${heredada} años (edad del cuestionario anterior)`;
  return "—";
}

const ACTION_LABEL: Record<string, string> = {
  acceso: "Entró en la plataforma",
  plan_abierto: "Abrió un documento",
  plan_descargado: "Descargó un documento",
  contrato_abierto: "Abrió el contrato",
  herramienta_abierta: "Usó una herramienta",
  llamada_abierta: "Vio su llamada estratégica",
};

export default async function ClientaPage({ params }: { params: { email: string } }) {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!isAdmin(me)) redirect("/miembros");

  const member = normalizeEmail(decodeURIComponent(params.email));
  if (!isValidEmail(member)) redirect("/miembros/clientas");

  // Todas las lecturas independientes en paralelo (perfil, planes, check-ins,
  // firmas y estado de asignación de contratos/anexo).
  const [profile, plans, checkins, allTemplates, mySignatures, assignments] = await Promise.all([
    sbSelect<Prof>("profiles", `select=*&email=eq.${encodeURIComponent(member)}`)
      .then((r0) => r0[0] ?? null).catch((e) => { console.error(e); return null; }),
    // Ojo con el null: si la consulta falla NO se devuelve una lista vacía. Una
    // lista vacía se pinta igual que «esta clienta no tiene planes», y eso es
    // mentira justo cuando más asusta —al acabar de subir uno—. Con null la
    // pantalla puede decir que no ha podido cargarlos.
    sbSelect<Plan>("plans", `select=*&member_email=eq.${encodeURIComponent(member)}&order=created_at.desc`)
      .catch((e) => { console.error("[clienta] plans", e); return null; }),
    sbSelect<CheckIn>("check_ins", `select=weight,created_at&member_email=eq.${encodeURIComponent(member)}&order=created_at.asc`)
      .catch((e) => { console.error(e); return [] as CheckIn[]; }),
    sbSelect<ContractTemplate>("contract_templates", "select=*&order=created_at.desc")
      .catch(() => [] as ContractTemplate[]),
    sbSelect<ContractSignature>("contract_signatures", `select=*&member_email=eq.${encodeURIComponent(member)}&order=signed_at.desc`)
      .catch(() => [] as ContractSignature[]),
    sbSelect<ContractAssignment>("contract_assignments", `select=*&member_email=eq.${encodeURIComponent(member)}&order=assigned_at.desc`)
      .catch(() => [] as ContractAssignment[]),
  ]);
  // La firma más reciente marca "firmó el contrato" en los hitos.
  const contractSig: ContractSignature | null = mySignatures[0] ?? null;
  const tplById = new Map(allTemplates.map((t) => [t.id, t]));

  // Evidencia de uso del servicio. Cada consulta cae por su cuenta si su tabla
  // aún no existe, para que la ficha se siga viendo entera.
  const [activity, habitDays, techniques] = await Promise.all([
    sbSelect<Activity>("activity_log", `select=action,detail,created_at&member_email=eq.${encodeURIComponent(member)}&order=created_at.desc&limit=200`)
      .catch(() => [] as Activity[]),
    sbSelect<{ day: string }>("habit_logs", `select=day&member_email=eq.${encodeURIComponent(member)}`)
      .catch(() => [] as { day: string }[]),
    sbSelect<{ created_at: string }>("technique_reviews", `select=created_at&member_email=eq.${encodeURIComponent(member)}`)
      .catch(() => [] as { created_at: string }[]),
  ]);

  // Llamadas estratégicas de esta clienta. Si la tabla aún no existe se avisa
  // con el SQL a mano, en vez de dejar la ficha a medias sin explicar por qué.
  let calls: MemberCall[] = [];
  let callsNeedSetup = false;
  try {
    calls = await sbSelect<MemberCall>(
      "member_calls",
      `select=*&member_email=eq.${encodeURIComponent(member)}&order=call_date.desc.nullslast,created_at.desc`
    );
  } catch (e) {
    if (isMissingTable(e)) callsNeedSetup = true;
    else console.error("[clienta] llamadas", e);
  }

  // Pauta de agua y suplementación. Si la tabla aún no existe se sigue
  // mostrando la ficha entera, solo que sin este apartado.
  let supplements: Supplement[] = [];
  try {
    supplements = await sbSelect<Supplement>(
      "member_supplements",
      `select=*&member_email=eq.${encodeURIComponent(member)}&order=created_at.asc`
    );
  } catch (e) { console.error("[clienta] suplementos", e); }

  const opened = activity.filter((a) => a.action === "plan_abierto" || a.action === "plan_descargado");
  const logins = activity.filter((a) => a.action === "acceso");
  const lastAccess = logins[0]?.created_at ?? null;

  // DÍAS DE USO VERIFICADOS. Cada check-in, cada día de hábitos y cada vídeo
  // exigió entrar en la plataforma y hacer algo, así que sirven para acreditar
  // uso real incluso antes de que existiera el registro de accesos.
  const dayOf = (iso: string) => iso.slice(0, 10);
  const activeDays = new Set<string>([
    ...checkins.map((c) => dayOf(c.created_at)),
    ...habitDays.map((h) => h.day),
    ...techniques.map((t) => dayOf(t.created_at)),
    ...activity.map((a) => dayOf(a.created_at)),
  ]);
  const activeSorted = Array.from(activeDays).sort();
  const firstUse = activeSorted[0] ?? null;
  const lastUse = activeSorted[activeSorted.length - 1] ?? null;

  // null = no se han podido leer. Para todo lo que cuenta y calcula se usa la
  // lista vacía, pero el apartado de planes lo dice en vez de callárselo.
  const planesFallo = plans === null;
  const planes = plans ?? [];

  // Cuándo toca cambiarle cada planificación. Sale del último plan subido de
  // cada tipo: no hay fecha que mantener a mano, subir un plan reinicia el ciclo.
  // `planes` viene de la más reciente a la más antigua, así que el primero de
  // cada tipo es el último subido.
  const hoy = hoyMadrid();
  const ultimoDe = (t: string) => {
    const p = planes.find((x) => x.type === t);
    return p ? diaDe(p.created_at) : null;
  };
  const renovAlimentacion = renovacionAlimentacion(ultimoDe("nutricion"), hoy);
  const renovEntrenamiento = renovacionEntrenamiento(ultimoDe("entrenamiento"), hoy);

  // PORCENTAJE DEL SERVICIO CONSUMIDO — fiel al apartado 6 de los Términos:
  // estrategia y planificación son el 70 %, seguimiento el 30 %.
  const svc = servicePct(profile?.renewal_date, planes.map((p) => p.created_at));
  const pct = svc?.pct ?? null;
  const cycleFrom = svc?.from ?? null;
  const cycleTo = svc?.to ?? null;
  const fmtDay = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

  // Hitos verificables, en orden cronológico: es lo que se aporta en una disputa.
  const milestones: { label: string; at: string | null }[] = [
    { label: "Alta en la plataforma", at: profile?.created_at ?? null },
    { label: `Aceptó las condiciones${profile?.terms_version ? ` (versión ${profile.terms_version})` : ""}`, at: profile?.terms_accepted_at ?? null },
    { label: "Entró por primera vez", at: logins.length ? logins[logins.length - 1].created_at : null },
    { label: "Completó el cuestionario", at: profile?.questionnaire_completed_at ?? null },
    { label: "Firmó el contrato", at: contractSig?.signed_at ?? null },
    { label: "Recibió su primer plan", at: planes.length ? planes[planes.length - 1].created_at : null },
    { label: "Abrió un documento por primera vez", at: opened.length ? opened[opened.length - 1].created_at : null },
    { label: "Hizo su primer check-in", at: checkins.length ? checkins[0].created_at : null },
  ].filter((m) => m.at);
  milestones.sort((a, b) => new Date(a.at as string).getTime() - new Date(b.at as string).getTime());

  // Solo lo que consta desde SIEMPRE. Los accesos y aperturas van aparte,
  // porque su registro empezó más tarde y un 0 aquí se leería, erróneamente,
  // como "no lo ha usado".
  const usage = [
    { v: activeDays.size, l: "días de uso" },
    { v: checkins.length, l: "check-ins" },
    { v: new Set(habitDays.map((h) => h.day)).size, l: "días de hábitos" },
    { v: techniques.length, l: "vídeos de técnica" },
    { v: planes.length, l: "planes recibidos" },
    { v: contractSig ? 1 : 0, l: "contrato firmado" },
  ];

  const q = profile?.questionnaire ?? {};
  const r = renewalInfo(profile?.renewal_date ?? null);
  const fin = serviceEndInfo(profile?.service_ends_at);

  // Gráfica y resumen de peso (solo pesos numéricos válidos).
  const points = checkins
    .map((c) => ({ date: fmtDate(c.created_at), weight: Number(c.weight) }))
    .filter((p) => Number.isFinite(p.weight));
  const firstWeight = points.length ? points[0].weight : null;
  const lastWeight = points.length ? points[points.length - 1].weight : null;
  // Positivo = kg bajados.
  const lost = firstWeight != null && lastWeight != null ? Math.round((firstWeight - lastWeight) * 10) / 10 : null;

  // URLs firmadas en paralelo: planes + todos los PDFs de contratos/anexos firmados.
  const [plansWithUrl, signedPdfUrls] = await Promise.all([
    Promise.all(planes.map(async (p) => ({ ...p, url: await sbSignedUrl("planes", p.file_path, 3600).catch(() => undefined) }))),
    Promise.all(mySignatures.map((s) => s.signed_pdf_path ? sbSignedUrl(CONTRACT_BUCKET, s.signed_pdf_path, 3600).catch(() => undefined) : Promise.resolve(undefined))),
  ]);
  const contratosFirmadosLista = mySignatures.map((s, i) => ({
    id: s.id,
    signedAt: s.signed_at,
    signerName: s.signer_name,
    title: (s.template_id && tplById.get(s.template_id)?.title) || "Contrato",
    kind: (s.template_id && tplById.get(s.template_id)?.kind) || "contrato",
    url: signedPdfUrls[i],
  }));
  const pendientes = assignments.filter((a) => a.status === "pendiente");

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Clienta</span>
              <h1 className="section-title text-2xl">{profile?.display_name || member}</h1>
              <p className="text-xs text-[#666666]">{member}</p>
              {profile?.terms_accepted_at ? (
                <>
                  <p className="text-xs text-[#1CA0E3] mt-1">
                    ✓ Aceptó las condiciones el {fmtFull(profile.terms_accepted_at)}
                    {profile.terms_version ? ` · versión ${profile.terms_version}` : ""}
                  </p>
                  {(profile.full_name || profile.address || profile.postal_code) && (
                    <p className="text-xs text-[#A0A0A0] mt-1">
                      {profile.full_name}
                      {profile.address ? ` · ${profile.address}` : ""}
                      {profile.postal_code ? ` · ${profile.postal_code}` : ""}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#666666] mt-1">
                  Sin aceptación registrada (clienta anterior a la pantalla de bienvenida).
                </p>
              )}
            </div>
            <Link href="/miembros/clientas" className="btn-outline text-sm px-5 py-2.5">← Clientas</Link>
          </div>

          {/* Renovación */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-white">Renovación del plan (mensual)</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${r.urgent ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>{r.text}</span>
            </div>
            <RenewalSetter member={member} current={profile?.renewal_date ?? undefined} />
          </div>

          {/* Vencimiento del servicio contratado. Va aparte de la renovación
              mensual a propósito: aquella se recalcula sola con cada plan, esta
              es la fecha en la que se le acaba lo que ha contratado. */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <h2 className="font-bold text-white">Vencimiento del servicio ({SERVICE_MONTHS} meses)</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${fin.urgent ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>{fin.text}</span>
            </div>
            <p className="text-xs text-[#666666] mb-4">
              {profile?.service_ends_at
                ? `Termina el ${new Date(profile.service_ends_at + "T12:00:00Z").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}. Se puso solo al darla de alta; cámbialo solo si con ella pactaste otra cosa.`
                : `Esta clienta es anterior al cambio, por eso no tiene fecha. Las altas nuevas la reciben solas: ${SERVICE_MONTHS} meses desde el día del alta.`}
            </p>
            <ServiceEndSetter member={member} current={profile?.service_ends_at ?? undefined} />
          </div>

          {/* Progreso de peso */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-white">Progreso de peso</h2>
              {lost != null && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${lost > 0 ? "bg-[#1CA0E3] text-white" : lost < 0 ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>
                  {lost > 0 ? `▼ ${lost.toLocaleString("es-ES")} kg bajados` : lost < 0 ? `▲ ${Math.abs(lost).toLocaleString("es-ES")} kg` : "Sin cambio"}
                </span>
              )}
            </div>
            {points.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center px-2 py-3 rounded-xl border border-[#252525] bg-[#141414]">
                  <div className="text-2xl font-extrabold text-white leading-none">{firstWeight?.toLocaleString("es-ES")}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">peso inicial</div>
                </div>
                <div className="text-center px-2 py-3 rounded-xl border border-[#252525] bg-[#141414]">
                  <div className="text-2xl font-extrabold text-white leading-none">{lastWeight?.toLocaleString("es-ES")}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">peso actual</div>
                </div>
                <div className="text-center px-2 py-3 rounded-xl border border-[#1CA0E3]/40 bg-[#1CA0E3]/5">
                  <div className="text-2xl font-extrabold text-[#1CA0E3] leading-none">{lost != null ? `${lost > 0 ? "−" : lost < 0 ? "+" : ""}${Math.abs(lost).toLocaleString("es-ES")}` : "—"}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">kg en total</div>
                </div>
              </div>
            )}
            <p className="text-sm text-[#A0A0A0] mb-3">
              Nombre de clienta: <span className="font-bold text-white">“{profile?.display_name || member}”</span>
            </p>
            <WeightChart points={points} />
          </div>

          {/* Renovación de la planificación */}
          <div className="card-dark p-6 !transform-none mb-6">
            <h2 className="font-bold text-white mb-1">Renovación de la planificación</h2>
            <p className="text-xs text-[#666666] mb-4">
              Se cuenta desde el último plan que le subiste. Al subirle uno nuevo, el contador vuelve a empezar solo.
            </p>
            <Renovaciones alimentacion={renovAlimentacion} entrenamiento={renovEntrenamiento} />
          </div>

          {/* Subir planes */}
          <div className="card-dark p-6 !transform-none mb-6">
            <h2 className="font-bold text-white mb-4">Subir plan</h2>
            <PlanUpload member={member} />
            {planesFallo ? (
              <p role="alert" className="mt-5 rounded-lg border border-[#FF6B6B]/40 bg-[#FF6B6B]/5 px-4 py-3 text-sm text-[#FF6B6B]">
                No se han podido cargar sus planes ahora mismo. <strong>No se ha borrado nada</strong>: es un
                fallo al consultarlos. Recarga la página en un momento.
              </p>
            ) : plansWithUrl.length === 0 ? (
              <p className="mt-5 text-xs text-[#666666]">Todavía no le has subido ningún plan.</p>
            ) : (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-xs text-[#A0A0A0]">Planes subidos:</p>
                {plansWithUrl.map((p) => (
                  <div key={p.id} className="rounded-lg border border-[#252525] px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-white min-w-0">
                        {p.type === "nutricion" ? "🥗 Nutrición" : "🏋️ Entrenamiento"}{p.title ? ` · ${p.title}` : ""}
                        <span className="text-[#666666] text-xs"> · {new Date(p.created_at).toLocaleDateString("es-ES")}</span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        {/* Sin enlace = el archivo no está en el almacén. Antes
                            simplemente no salía «Ver» y no había forma de saber
                            que ese plan estaba roto para la clienta. */}
                        {p.url
                          ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm">Ver</a>
                          : <span className="text-[#FF6B6B] text-xs" title="El archivo no está disponible. Vuelve a subirlo.">⚠️ sin archivo</span>}
                        <PlanDelete id={p.id} label={p.type === "nutricion" ? "nutrición" : "entrenamiento"} />
                      </span>
                    </div>
                    {p.note && <p className="text-xs text-[#A0A0A0] mt-1.5 whitespace-pre-wrap border-t border-[#252525] pt-1.5">💬 {p.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pauta diaria: agua, pasos y suplementación */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <h2 className="font-bold text-white">Agua, pasos y suplementación</h2>
              {supplements.length > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#1CA0E3] text-white">
                  💊 {supplements.length} {supplements.length === 1 ? "suplemento" : "suplementos"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#666666] mb-5">
              Le aparece en su perfil: el agua y los pasos junto a sus hábitos, y los suplementos junto a su plan.
            </p>
            <SupplementPlan member={member} agua={profile?.water_target_l ?? null} pasosObjetivo={profile?.steps_target ?? null} items={supplements} />
          </div>

          {/* Llamadas estratégicas: el enlace de la grabación de cada una */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <h2 className="font-bold text-white">Llamadas estratégicas</h2>
              {calls.length > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#1CA0E3] text-white">
                  📞 {calls.length} {calls.length === 1 ? "llamada" : "llamadas"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#666666] mb-4">
              Pega aquí el enlace de la grabación de su llamada. Le aparece en su perfil, en la pestaña «Llamadas»,
              y solo la ve ella.
            </p>

            {callsNeedSetup ? (
              <SetupSql title="Falta un paso para poder subir llamadas" sql={CALLS_SQL} />
            ) : (
              <>
                <CallAdd member={member} />

                {calls.length > 0 && (
                  <div className="mt-5 flex flex-col gap-2">
                    <p className="text-xs font-bold text-[#666666] uppercase tracking-wide">Llamadas subidas</p>
                    {calls.map((c) => (
                      <div key={c.id} className="rounded-lg border border-[#252525] px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          {/* Título y fecha en dos líneas: en el móvil, con todo
                              en una, la fecha se cortaba y era justo el dato que
                              distingue una llamada de otra. */}
                          <span className="min-w-0">
                            <span className="block text-sm text-white truncate">📞 {c.title || DEFAULT_TITLE}</span>
                            <span className="block text-xs text-[#666666]">{callDay(c)}</span>
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm">Ver</a>
                            <CallDelete id={c.id} />
                          </span>
                        </div>
                        {c.note && (
                          <p className="text-xs text-[#A0A0A0] mt-1.5 whitespace-pre-wrap border-t border-[#252525] pt-1.5">💬 {c.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Contratos: asignar + estado + firmados */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-white">Contratos y anexo de salud</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {pendientes.length > 0 && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40">
                    ⏳ {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"} de firma
                  </span>
                )}
                {contratosFirmadosLista.length > 0 && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#1CA0E3] text-white">
                    ✍️ {contratosFirmadosLista.length} firmado{contratosFirmadosLista.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>

            <ContractAssign
              memberEmail={member}
              templates={allTemplates.filter((t) => t.active)}
              assignments={assignments.map((a) => ({ id: a.id, template_id: a.template_id, status: a.status }))}
              exempt={profile?.contracts_exempt !== false}
            />

            {contratosFirmadosLista.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">Documentos firmados</p>
                <div className="flex flex-col gap-2">
                  {contratosFirmadosLista.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#252525] px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.kind === "anexo_salud" ? "bg-[#FFB800] text-black" : "bg-[#1CA0E3] text-white"}`}>
                            {c.kind === "anexo_salud" ? "Anexo salud" : "Contrato"}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white truncate mt-1">{c.title}</p>
                        <p className="text-xs text-[#A0A0A0]">
                          Firmado por {c.signerName} el {new Date(c.signedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm font-semibold shrink-0">Descargar</a>
                      ) : (
                        <span className="text-[#666666] text-xs shrink-0">No disponible</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Uso del servicio: evidencia para disputas y reclamaciones */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <h2 className="font-bold text-white">Uso del servicio</h2>
              {lastAccess && <span className="text-xs text-[#A0A0A0]">Último acceso: {fmtFull(lastAccess)}</span>}
            </div>
            <p className="text-xs text-[#666666] mb-4">
              Registro de la actividad de la clienta. Útil para acreditar que el servicio se ha prestado y utilizado.
            </p>

            {/* Porcentaje del ciclo pagado ya consumido */}
            {pct != null && cycleFrom && cycleTo && (
              <div className="rounded-xl border border-[#1CA0E3]/30 bg-[#1CA0E3]/5 p-4 mb-5">
                <div className="flex items-end justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1CA0E3]">Servicio consumido</p>
                    <p className="text-xs text-[#A0A0A0] mt-0.5">
                      Ciclo del {fmtDay(cycleFrom)} al {fmtDay(cycleTo)}
                    </p>
                  </div>
                  <span className="text-3xl font-extrabold leading-none text-white">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#0A0A0A] overflow-hidden">
                  <div className="h-full bg-[#1CA0E3]" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-[#666666] mt-2">
                  Parte del servicio ya prestada en el ciclo en curso, según el reparto contractual
                  <strong className="text-white"> 70 % estrategia y planificación / 30 % seguimiento y adaptaciones</strong>.
                  Al entregar el plan del ciclo, el contador salta al 70 %; el 30 % restante se prorratea el resto del ciclo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {usage.map((u) => (
                <div key={u.l} className="text-center px-2 py-3 rounded-xl border border-[#252525] bg-[#141414]">
                  <div className="text-2xl font-extrabold leading-none text-white">{u.v}</div>
                  <div className="text-[10px] text-[#A0A0A0] mt-1.5 leading-tight">{u.l}</div>
                </div>
              ))}
            </div>

            {firstUse && lastUse && (
              <p className="text-sm text-[#A0A0A0] mb-5">
                Usó la plataforma en <strong className="text-white">{activeDays.size} días distintos</strong>,
                entre el {fmtDay(new Date(firstUse + "T00:00:00Z"))} y el {fmtDay(new Date(lastUse + "T00:00:00Z"))}.
                Cada uno de esos días requirió entrar en su área privada.
              </p>
            )}


            {milestones.length > 0 && (
              <>
                <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">Hitos</p>
                <div className="flex flex-col gap-1.5 mb-5">
                  {milestones.map((m) => (
                    <div key={m.label} className="flex items-start justify-between gap-3 text-sm border-b border-[#161616] pb-1.5">
                      <span className="text-[#A0A0A0]">{m.label}</span>
                      <span className="text-white text-xs shrink-0 text-right">{fmtFull(m.at as string)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-2">Actividad reciente</p>
            {activity.length === 0 ? (
              <p className="text-sm text-[#666666]">
                Todavía no hay entradas: el registro detallado acaba de activarse. Se irá llenando con cada
                acceso y cada documento que abra a partir de ahora.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                {activity.slice(0, 60).map((a, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-sm border-b border-[#161616] pb-1.5">
                    <span className="text-[#A0A0A0]">
                      {ACTION_LABEL[a.action] ?? a.action}
                      {a.detail ? <span className="text-[#666666]"> · {a.detail}</span> : ""}
                    </span>
                    <span className="text-white text-xs shrink-0 text-right">{fmtFull(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cuestionario */}
          <div className="card-dark p-6 !transform-none">
            <h2 className="font-bold text-white mb-4">Cuestionario</h2>
            {Object.keys(q).length === 0 ? (
              <p className="text-sm text-[#666666]">La clienta aún no ha rellenado su cuestionario.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.id}>
                    <p className="text-xs text-[#666666]">{f.label}</p>
                    {f.id === "fecha_nacimiento" ? (
                      <p className="text-sm text-white">{nacimientoTexto(q)}</p>
                    ) : (
                      <p className="text-sm text-white whitespace-pre-wrap">{q[f.id] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zona de eliminación */}
          <div className="card-dark p-6 !transform-none mt-6 border-[#FF6B6B]/20">
            <h2 className="font-bold text-white mb-1">Eliminar clienta</h2>
            <p className="text-sm text-[#A0A0A0] mb-4">Le quita el acceso al área de miembros. Sus datos no se borran.</p>
            <RemoveClient email={member} />
          </div>
        </div>
      </main>
    </>
  );
}
