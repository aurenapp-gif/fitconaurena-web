import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import CheckinForm from "@/components/CheckinForm";
import AdminCheckinReply from "@/components/AdminCheckinReply";
import WeightChart from "@/components/WeightChart";
import ProgressSummary from "@/components/ProgressSummary";
import PhotoLightbox from "@/components/PhotoLightbox";
import EntrenoProgreso from "@/components/EntrenoProgreso";
import CheckinsBuscador, { type FichaBusqueda } from "@/components/CheckinsBuscador";
import ComparativaRevision from "@/components/ComparativaRevision";
import { Grupo, NotaCoach, Privado } from "@/components/Grupo";
import { adminEmails, isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl, sbSignedThumb } from "@/lib/supabase";
import { periodoDe, proximaRevision, todayMadrid, NORMA } from "@/lib/revisiones";
import { fechaCorta } from "@/lib/renovaciones";
import { comparar, objetivoDe } from "@/lib/progreso";
import { compararEntreno, ejerciciosDe, nombresDe, type Ejercicio, type Progreso } from "@/lib/entreno";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export const metadata: Metadata = { title: "Revisiones", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type CheckIn = {
  id: string;
  member_email: string;
  weight: number | null;
  note: string | null;
  photo_path: string | null;
  photo_front: string | null;
  photo_side: string | null;
  photo_back: string | null;
  coach_reply: string | null;
  coach_reply_at: string | null;
  created_at: string;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  arm: number | null;
  thigh: number | null;
  glute?: number | null;
  back?: number | null;
  exercises?: unknown;
};

// Mismo orden que el formulario (de arriba abajo del cuerpo).
const MEASURE_LABELS: { key: keyof CheckIn; label: string }[] = [
  { key: "chest", label: "Pecho" },
  { key: "back", label: "Espalda" },
  { key: "arm", label: "Brazo" },
  { key: "waist", label: "Cintura" },
  { key: "hips", label: "Cadera" },
  { key: "glute", label: "Glúteo" },
  { key: "thigh", label: "Cuádriceps" },
];

/** Un valor numérico de verdad. `Number(null)` es 0 y pasaría por un peso de
 * cero kilos: una revisión sin peso no puede acabar dibujada como «0,0». */
function hayNumero(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}
const fechaLarga = (d: string) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/** Índice de quincena (dos por mes) de una fecha ISO, en horario de Madrid. */
function quincenaIndex(iso: string): number {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));
  const [y, m, day] = d.split("-").map(Number);
  return (y * 12 + (m - 1)) * 2 + (day >= 15 ? 1 : 0);
}

/** Revisiones seguidas: quincenas consecutivas con al menos una, hasta la
 * quincena en curso o la anterior (si la de ahora aún no toca o no está). */
function revisionesSeguidas(fechas: string[], hoy: string): number {
  if (!fechas.length) return 0;
  const qs = Array.from(new Set(fechas.map(quincenaIndex))).sort((a, b) => a - b);
  const ahora = quincenaIndex(hoy + "T12:00:00Z");
  const ultima = qs[qs.length - 1];
  if (ahora - ultima > 1) return 0;
  let n = 1;
  for (let i = qs.length - 1; i > 0; i--) {
    if (qs[i] - qs[i - 1] === 1) n++;
    else break;
  }
  return n;
}

const sign = (p: string | null) => (p ? sbSignedUrl("checkins", p, 3600).catch(() => undefined) : Promise.resolve(undefined));
// Miniatura con fallback a imagen completa si la transformación no está disponible.
const signThumb = (p: string | null, w = 500): Promise<string | undefined> =>
  p ? sbSignedThumb("checkins", p, w).catch(() => sbSignedUrl("checkins", p, 3600).catch(() => undefined)) : Promise.resolve(undefined);

async function withPhoto(rows: CheckIn[]) {
  return Promise.all(
    rows.map(async (r) => {
      const make = async (path: string | null, label: string) => {
        if (!path) return null;
        const [full, thumb] = await Promise.all([sign(path), signThumb(path)]);
        return full ? { label, url: full, thumb: thumb || full } : null;
      };
      const photos = (
        await Promise.all([
          make(r.photo_front, "Frente"),
          make(r.photo_side, "Perfil"),
          make(r.photo_back, "Espaldas"),
          make(r.photo_path, "Foto"),
        ])
      ).filter(Boolean) as { label: string; url: string; thumb: string }[];
      return { ...r, photos };
    })
  );
}

export default async function CheckinsPage({
  searchParams,
}: {
  searchParams?: { clienta?: string };
}) {
  const email = await requireMember();
  const admin = isAdmin(email);
  const hoy = todayMadrid();

  // Clienta elegida en el buscador (solo la coach). Con una elegida se trae su
  // historial ENTERO y en orden, que es lo que hace falta para comparar
  // sesiones; sin elegir, las últimas cincuenta de todas.
  const elegida = admin && searchParams?.clienta ? normalizeEmail(searchParams.clienta) : "";
  const filtrada = elegida !== "" && isValidEmail(elegida);
  // Correo cuyo historial se enseña de forma cronológica (la clienta o la
  // elegida por la coach). Sirve para los ejercicios y el sueño.
  const quien = admin ? (filtrada ? elegida : "") : email;

  const q = admin
    ? filtrada
      ? `select=*&member_email=eq.${encodeURIComponent(elegida)}&order=created_at.asc`
      : "select=*&order=created_at.desc&limit=50"
    : `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc`;
  const desde30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const coachEmail = adminEmails()[0];

  const [rows, perfil, planEntreno, suenos, coachNombre] = await Promise.all([
    sbSelect<CheckIn>("check_ins", q).catch((e) => { console.error("[checkins] error", e); return [] as CheckIn[]; }),
    admin
      ? Promise.resolve(null)
      : sbSelect<{ questionnaire: Record<string, string> | null; hide_weight?: boolean | null }>(
          "profiles", `select=questionnaire,hide_weight&email=eq.${encodeURIComponent(email)}`
        ).then((r) => r[0] ?? null).catch((e) => { console.error("[checkins] perfil", e); return null; }),
    quien
      ? sbSelect<{ exercises: unknown; title: string | null }>("plans", `select=exercises,title&member_email=eq.${encodeURIComponent(quien)}&type=eq.entrenamiento&order=created_at.desc&limit=1`)
          .then((r) => r[0] ?? null).catch(() => null)
      : Promise.resolve(null),
    quien
      ? sbSelect<{ sleep: number | null }>("habit_logs", `select=sleep&member_email=eq.${encodeURIComponent(quien)}&day=gte.${desde30}&sleep=not.is.null`)
          .catch(() => [] as { sleep: number | null }[])
      : Promise.resolve([] as { sleep: number | null }[]),
    coachEmail
      ? sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(coachEmail)}`)
          .then((r) => r[0]?.display_name ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);
  const inicialCoach = (coachNombre || "C").trim().charAt(0).toUpperCase();
  const goalWeight = (() => { const g = Number(perfil?.questionnaire?.peso_objetivo); return Number.isFinite(g) && g > 0 ? g : null; })();
  const ocultarPeso = !!perfil?.hide_weight;
  const suenoMedio = suenos.length ? suenos.reduce((a, s) => a + Number(s.sleep ?? 0), 0) / suenos.length : null;

  // Quincena en curso (día 1 o día 15). Para la clienta, si ya subió la suya;
  // para la coach, quién la ha hecho y quién no.
  const periodo = periodoDe(hoy);
  const hechaEstaQuincena = admin
    ? false
    : rows.some((r) => r.created_at.slice(0, 10) >= periodo.inicio);
  const prox = proximaRevision(hoy, hechaEstaQuincena);

  let pendientes: string[] = [];
  let alDia: string[] = [];
  // Nombre de cada clienta, para no enseñarle correos donde puede ir el nombre.
  const nombres = new Map<string, string>();
  let fichas: FichaBusqueda[] = [];
  // Objetivo de la clienta filtrada: es lo que decide qué es mejorar y qué no.
  let objetivo: string | null = null;

  if (admin) {
    try {
      const [profs, hechas, todas] = await Promise.all([
        sbSelect<{ email: string; display_name: string | null; access_revoked: boolean | null; questionnaire: Record<string, string> | null }>(
          "profiles", "select=email,display_name,access_revoked,questionnaire"
        ),
        sbSelect<{ member_email: string }>("check_ins", `select=member_email&created_at=gte.${periodo.inicio}T00:00:00`),
        // Una fila por revisión, solo con correo y fecha: es lo justo para
        // contar cuántas tiene cada una y cuándo fue la última.
        sbSelect<{ member_email: string; created_at: string }>("check_ins", "select=member_email,created_at"),
      ]);
      const yaEstan = new Set(hechas.map((h) => h.member_email));
      const cuenta = new Map<string, { n: number; ultima: string }>();
      for (const c of todas) {
        const prev = cuenta.get(c.member_email);
        if (!prev) cuenta.set(c.member_email, { n: 1, ultima: c.created_at });
        else cuenta.set(c.member_email, { n: prev.n + 1, ultima: c.created_at > prev.ultima ? c.created_at : prev.ultima });
      }
      for (const p of profs) {
        if (isAdmin(p.email)) continue;
        nombres.set(p.email, p.display_name || p.email);
        if (p.email === elegida) objetivo = objetivoDe(p.questionnaire);
        if (p.access_revoked === true) continue;
        (yaEstan.has(p.email) ? alDia : pendientes).push(p.display_name || p.email);
        const c = cuenta.get(p.email);
        fichas.push({
          email: p.email,
          nombre: p.display_name || p.email,
          revisiones: c?.n ?? 0,
          ultima: c?.ultima ?? null,
        });
      }
      pendientes.sort(); alDia.sort();
      // Primero quien más revisiones tiene: es con quien hay algo que comparar.
      fichas.sort((a, b) => b.revisiones - a.revisiones || a.nombre.localeCompare(b.nombre, "es"));
    } catch (e) { console.error("[checkins] pendientes", e); }
  }

  const nombreElegida = filtrada ? nombres.get(elegida) ?? elegida : "";

  // `rows` de la clienta (o de la elegida) viene de la más vieja a la más
  // nueva. Para enseñarlas se le da la vuelta, pero se guarda el índice
  // cronológico porque cada una se compara con la que tiene DETRÁS en el
  // tiempo, no en pantalla.
  const cronologicas = admin ? (filtrada ? rows : []) : rows;
  const items = await withPhoto(admin ? (filtrada ? [...rows].reverse() : rows) : [...rows].reverse());
  const posicion = new Map(cronologicas.map((r, i) => [r.id, i]));

  // Entrenamiento: progreso de cada revisión frente a la anterior que tenga
  // ejercicios, y los del plan vigente para el formulario (prerrellenados con
  // la última revisión).
  const entrenoDe = new Map<string, Progreso[]>();
  let ultimoConEjercicios: Ejercicio[] | null = null;
  for (const r of cronologicas) {
    const ej = ejerciciosDe(r.exercises);
    if (ej.length === 0) continue;
    entrenoDe.set(r.id, compararEntreno(ej, ultimoConEjercicios));
    ultimoConEjercicios = ej;
  }
  const nombresPlan = nombresDe(planEntreno?.exercises);
  const previos = new Map((ultimoConEjercicios ?? []).map((e) => [e.name.toLowerCase(), e]));
  const ejerciciosForm: Ejercicio[] = nombresPlan.map((n) => ({ name: n, weight: previos.get(n.toLowerCase())?.weight ?? null, reps: previos.get(n.toLowerCase())?.reps ?? null }));
  const ultimaConEntreno = [...cronologicas].reverse().find((r) => entrenoDe.has(r.id));

  // Peso de la clienta filtrada, para su gráfica.
  const puntosClienta = filtrada
    ? cronologicas.filter((r) => hayNumero(r.weight)).map((r) => ({ date: fmt(r.created_at), weight: Number(r.weight) }))
    : [];

  // Resumen de progreso (solo clienta). rows viene en orden ascendente.
  const mine = admin ? [] : rows;
  const validWeights = mine.filter((r) => hayNumero(r.weight)).map((r) => Number(r.weight));
  const firstWeight = validWeights.length ? validWeights[0] : null;
  const lastWeight = validWeights.length ? validWeights[validWeights.length - 1] : null;
  const weightDelta =
    firstWeight != null && lastWeight != null ? Math.round((lastWeight - firstWeight) * 10) / 10 : null;
  const seguidas = admin ? 0 : revisionesSeguidas(mine.map((r) => r.created_at), hoy);
  // Cintura: primera vs última medida registrada (medida estrella del progreso).
  const cinturas = mine.filter((r) => hayNumero(r.waist)).map((r) => ({ date: fmt(r.created_at), value: Number(r.waist) }));
  const firstWaist = cinturas.length ? cinturas[0].value : null;
  const lastWaist = cinturas.length ? cinturas[cinturas.length - 1].value : null;
  const firstWithFront = mine.find((r) => r.photo_front);
  const lastWithFront = [...mine].reverse().find((r) => r.photo_front);
  const [beforePhoto, afterPhoto] = await Promise.all([
    signThumb(firstWithFront?.photo_front ?? null, 700),
    signThumb(lastWithFront?.photo_front ?? null, 700),
  ]);

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className={`${admin ? "container-wide" : "container-content"} relative z-10 py-6 lg:py-12`}>
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <h1 className="page-title">
              {admin ? (filtrada ? nombreElegida : "Revisiones") : "Mis revisiones"}
            </h1>
            {admin && filtrada && (
              <Link href="/miembros/checkins" className="btn-outline text-sm px-5 py-2.5">← Todas</Link>
            )}
          </div>

          {/* Estado de la quincena en curso. A la clienta le dice si le falta la
              suya; a la coach, quién la ha hecho y quién no. */}
          {admin && filtrada ? null : admin ? (
            <div className="card-dark p-5 !transform-none mb-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <h2 className="font-semibold text-ink">Revisión del {periodo.etiqueta}</h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${pendientes.length === 0 ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}>
                  {alDia.length} de {alDia.length + pendientes.length} hechas
                </span>
              </div>
              <p className="text-xs text-ink-subtle mb-3">{NORMA}</p>
              {pendientes.length === 0 ? (
                <p className="text-sm text-success">Todas al día</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">Sin hacer ({pendientes.length})</p>
                  <p className="text-sm text-ink mb-3">{pendientes.join(" · ")}</p>
                </>
              )}
              {alDia.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">Hechas ({alDia.length})</p>
                  <p className="text-sm text-ink-muted">{alDia.join(" · ")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-surface rounded-[14px] px-4 py-3 mb-5 flex items-start gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={hechaEstaQuincena ? "rgb(var(--c-success))" : "rgb(var(--c-warn))"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                {hechaEstaQuincena ? <path d="M20 6L9 17l-5-5" /> : <><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>}
              </svg>
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-ink leading-snug">
                  {hechaEstaQuincena ? `Revisión del ${periodo.etiqueta} hecha` : `Tu revisión del ${periodo.etiqueta}`}
                </p>
                <p className="text-[15px] text-ink-muted mt-0.5">
                  {hechaEstaQuincena
                    ? `La siguiente, el ${fechaCorta(prox.fecha)}. Las revisiones son el 1 y el 15 de cada mes.`
                    : periodo.dia === 0 ? "Hoy toca. Peso opcional y tres fotos: frente, perfil y espaldas." : `Sigue sin subir. Peso opcional y tres fotos: frente, perfil y espaldas.`}
                </p>
              </div>
            </div>
          )}

          {!admin && (
            <div className="flex flex-col gap-5 mb-5">
              <ProgressSummary
                total={mine.length}
                seguidas={seguidas}
                firstWeight={firstWeight}
                lastWeight={lastWeight}
                weightDelta={weightDelta}
                goalWeight={goalWeight}
                firstWaist={firstWaist}
                lastWaist={lastWaist}
                sueno={suenoMedio}
                cinturas={cinturas}
                ocultarPeso={ocultarPeso}
                beforePhoto={beforePhoto}
                afterPhoto={afterPhoto}
                beforeDate={firstWithFront ? fmt(firstWithFront.created_at) : undefined}
                afterDate={lastWithFront ? fmt(lastWithFront.created_at) : undefined}
              />
              {ultimaConEntreno && (
                <Grupo label="Tu entrenamiento" foot="Comparado con tu revisión anterior por el peso que mueves y las repeticiones que haces.">
                  <EntrenoProgreso progreso={entrenoDe.get(ultimaConEntreno.id) ?? []} />
                </Grupo>
              )}
              {nombresPlan.length === 0 && mine.length === 0 && (
                <p className="text-[13px] text-ink-muted px-4">Cuando tu coach suba tu plan de entrenamiento con sus ejercicios, aquí apuntarás tus pesos y repeticiones en cada revisión.</p>
              )}
              <CheckinForm plegado={mine.length > 0} ejercicios={ejerciciosForm} />
            </div>
          )}

          {admin && !filtrada && fichas.length > 0 && <CheckinsBuscador fichas={fichas} />}

          {admin && filtrada && (
            <div className="card-dark p-6 !transform-none mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink truncate">{nombreElegida}</h2>
                  <p className="text-xs text-ink-subtle">
                    {cronologicas.length} {cronologicas.length === 1 ? "revisión" : "revisiones"}
                    {objetivo ? ` · objetivo: ${objetivo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/miembros/clientas/${encodeURIComponent(elegida)}`} className="btn-outline text-xs px-4 py-2">
                    Ver su ficha
                  </Link>
                  <Link href="/miembros/checkins" className="btn-outline text-xs px-4 py-2">
                    Quitar filtro
                  </Link>
                </div>
              </div>

              {puntosClienta.length >= 2 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">Peso</p>
                  <WeightChart points={puntosClienta} />
                </div>
              )}

              {/* Desde la primera hasta la última: el balance de todo el servicio. */}
              {cronologicas.length >= 2 && (
                <div>
                  <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">
                    Desde su primera revisión ({fmt(cronologicas[0].created_at)})
                  </p>
                  <ComparativaRevision
                    cambios={comparar(
                      cronologicas[cronologicas.length - 1] as unknown as Record<string, unknown>,
                      cronologicas[0] as unknown as Record<string, unknown>
                    )}
                    etiquetaReferencia="la primera"
                  />
                </div>
              )}

              {ultimaConEntreno && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">
                    Entrenamiento · última revisión frente a la anterior
                  </p>
                  <div className="rounded-xl bg-page">
                    <EntrenoProgreso progreso={entrenoDe.get(ultimaConEntreno.id) ?? []} />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-ink-subtle mt-3">
                Azul lo que baja, rojo lo que sube, gris lo que se queda igual. Siempre.
              </p>
            </div>
          )}

          {!admin && items.length > 0 && <span className="group-label">Anteriores</span>}

          <div className="flex flex-col gap-3">
            {items.length === 0 ? (
              <p className="text-[15px] text-ink-muted px-4">{admin ? "Aún no hay revisiones." : "Tu primera revisión aparecerá aquí."}</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className={admin ? "card-dark !p-4 !transform-none" : "bg-surface rounded-[14px] p-4"}>
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {admin && !filtrada && (
                        <Link href={`/miembros/checkins?clienta=${encodeURIComponent(it.member_email)}`}
                          className="min-h-[40px] inline-flex items-center text-sm font-semibold text-ink hover:text-brand">
                          {nombres.get(it.member_email) ?? it.member_email}
                        </Link>
                      )}
                      {admin && filtrada && (
                        <span className="text-xs font-semibold text-ink-subtle">
                          Revisión {(posicion.get(it.id) ?? 0) + 1} de {cronologicas.length}
                        </span>
                      )}
                      {!admin && <span className="text-[17px] font-semibold text-ink">{fechaLarga(it.created_at)}</span>}
                      {it.weight != null && (admin || !ocultarPeso) && (
                        <span className={admin ? "text-sm font-semibold text-brand" : "text-[15px] text-ink-muted"}>{it.weight} kg</span>
                      )}
                    </div>
                    <span className="text-[13px] text-ink-muted">{admin ? fmt(it.created_at) : ""}</span>
                  </div>
                  {it.note && <p className="text-[15px] text-ink-muted whitespace-pre-wrap mb-3">{it.note}</p>}
                  {admin && filtrada && (
                    <ComparativaRevision
                      cambios={comparar(
                        it as unknown as Record<string, unknown>,
                        (posicion.get(it.id) ?? 0) > 0
                          ? (cronologicas[(posicion.get(it.id) ?? 0) - 1] as unknown as Record<string, unknown>)
                          : null
                      )}
                      etiquetaReferencia="la anterior"
                    />
                  )}
                  {!(admin && filtrada) && MEASURE_LABELS.some((m) => it[m.key] != null) && (
                    <p className="text-[15px] text-ink-muted mb-3">
                      {MEASURE_LABELS.filter((m) => it[m.key] != null).map((m) => `${m.label} ${it[m.key] as number}`).join(" · ")} cm
                    </p>
                  )}
                  {admin && filtrada && entrenoDe.has(it.id) && (
                    <div className="rounded-xl bg-page mb-3"><EntrenoProgreso progreso={entrenoDe.get(it.id) ?? []} compacto /></div>
                  )}
                  {!admin && entrenoDe.has(it.id) && (
                    <details className="mb-3 group">
                      <summary className="text-[15px] text-brand cursor-pointer list-none min-h-[40px] inline-flex items-center [&::-webkit-details-marker]:hidden">Entrenamiento de esta revisión</summary>
                      <div className="rounded-xl bg-page mt-2"><EntrenoProgreso progreso={entrenoDe.get(it.id) ?? []} compacto /></div>
                    </details>
                  )}
                  {it.photos.length > 0 && (
                    <>
                      <PhotoLightbox photos={it.photos} />
                      {!admin && <div className="mt-1"><Privado>Solo tú y tu coach veis estas fotos.</Privado></div>}
                    </>
                  )}
                  {it.coach_reply ? (
                    admin ? (
                      <div className="mt-3 rounded-lg bg-brand-soft px-4 py-3">
                        <p className="text-xs font-semibold text-brand mb-1">Tu respuesta</p>
                        <p className="text-sm text-ink whitespace-pre-wrap">{it.coach_reply}</p>
                      </div>
                    ) : (
                      <div className="mt-2 -mx-4 border-t border-line"><NotaCoach texto={it.coach_reply} inicial={inicialCoach} fecha={it.coach_reply_at ? fechaLarga(it.coach_reply_at) : undefined} /></div>
                    )
                  ) : (
                    admin && <AdminCheckinReply id={it.id} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
