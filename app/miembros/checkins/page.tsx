import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import CheckinForm from "@/components/CheckinForm";
import AdminCheckinReply from "@/components/AdminCheckinReply";
import WeightChart from "@/components/WeightChart";
import ProgressSummary from "@/components/ProgressSummary";
import PhotoLightbox from "@/components/PhotoLightbox";
import CheckinsBuscador, { type FichaBusqueda } from "@/components/CheckinsBuscador";
import ComparativaRevision from "@/components/ComparativaRevision";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl, sbSignedThumb } from "@/lib/supabase";
import { periodoDe, todayMadrid, NORMA } from "@/lib/revisiones";
import { comparar, objetivoDe } from "@/lib/progreso";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export const metadata: Metadata = { title: "Check-ins", robots: { index: false, follow: false } };
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

// Índice de semana alineado a lunes (epoch 1970-01-01 fue jueves).
function weekIndex(d: string): number {
  return Math.floor((Math.floor(new Date(d).getTime() / 86400000) + 3) / 7);
}

// Racha de semanas consecutivas con al menos un check-in (0 si se rompió).
function weeklyStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const weeks = Array.from(new Set(dates.map(weekIndex))).sort((a, b) => a - b);
  const nowW = weekIndex(new Date().toISOString());
  const lastW = weeks[weeks.length - 1];
  if (nowW - lastW > 1) return 0; // último check-in hace más de 1 semana
  let streak = 1;
  for (let i = weeks.length - 1; i > 0; i--) {
    if (weeks[i] - weeks[i - 1] === 1) streak++;
    else break;
  }
  return streak;
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

  // Clienta elegida en el buscador (solo la coach). Con una elegida se trae su
  // historial ENTERO y en orden, que es lo que hace falta para comparar
  // sesiones; sin elegir, las últimas cincuenta de todas.
  const elegida = admin && searchParams?.clienta ? normalizeEmail(searchParams.clienta) : "";
  const filtrada = elegida !== "" && isValidEmail(elegida);

  const q = admin
    ? filtrada
      ? `select=*&member_email=eq.${encodeURIComponent(elegida)}&order=created_at.asc`
      : "select=*&order=created_at.desc&limit=50"
    : `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc`;
  const [rows, goalWeight] = await Promise.all([
    sbSelect<CheckIn>("check_ins", q).catch((e) => { console.error("[checkins] error", e); return [] as CheckIn[]; }),
    admin
      ? Promise.resolve(null)
      : sbSelect<{ questionnaire: Record<string, string> | null }>(
          "profiles", `select=questionnaire&email=eq.${encodeURIComponent(email)}`
        ).then((r) => {
          const g = Number(r[0]?.questionnaire?.peso_objetivo);
          return Number.isFinite(g) ? g : null;
        }).catch((e) => { console.error("[checkins] goal", e); return null; }),
  ]);

  // Quincena en curso (día 1 o día 15). Para la clienta, si ya subió la suya;
  // para la coach, quién la ha hecho y quién no.
  const periodo = periodoDe(todayMadrid());
  const hechaEstaQuincena = admin
    ? false
    : rows.some((r) => r.created_at.slice(0, 10) >= periodo.inicio);

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

  // `rows` de la clienta filtrada viene de la más vieja a la más nueva. Para
  // enseñarlas se le da la vuelta, pero se guarda el índice cronológico porque
  // cada una se compara con la que tiene DETRÁS en el tiempo, no en pantalla.
  const cronologicas = filtrada ? rows : [];
  const items = await withPhoto(admin ? (filtrada ? [...rows].reverse() : rows) : [...rows].reverse());

  // Peso de la clienta filtrada, para su gráfica.
  const puntosClienta = filtrada
    ? cronologicas.filter((r) => hayNumero(r.weight)).map((r) => ({ date: fmt(r.created_at), weight: Number(r.weight) }))
    : [];
  // Índice de cada revisión dentro del orden cronológico, por id.
  const posicion = new Map(cronologicas.map((r, i) => [r.id, i]));
  // Solo pesos numéricos válidos (un valor corrupto nunca debe romper la gráfica).
  const points = (admin ? [] : rows)
    .filter((r) => hayNumero(r.weight))
    .map((r) => ({ date: fmt(r.created_at), weight: Number(r.weight) }));

  // Resumen de progreso (solo clienta). rows viene en orden ascendente.
  const mine = admin ? [] : rows;
  const validWeights = mine.filter((r) => hayNumero(r.weight)).map((r) => Number(r.weight));
  const firstWeight = validWeights.length ? validWeights[0] : null;
  const lastWeight = validWeights.length ? validWeights[validWeights.length - 1] : null;
  const weightDelta =
    firstWeight != null && lastWeight != null ? Math.round((lastWeight - firstWeight) * 10) / 10 : null;
  const streak = admin ? 0 : weeklyStreak(mine.map((r) => r.created_at));
  // Cintura: primera vs última medida registrada (medida estrella del progreso).
  const waists = mine.filter((r) => hayNumero(r.waist)).map((r) => Number(r.waist));
  const firstWaist = waists.length ? waists[0] : null;
  const lastWaist = waists.length ? waists[waists.length - 1] : null;
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
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h1 className="text-[26px] lg:text-3xl font-extrabold text-ink tracking-tight leading-tight">
              {admin ? (filtrada ? nombreElegida : "Check-ins") : "Mis check-ins"}
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
                <h2 className="font-bold text-ink">Revisión del {periodo.etiqueta}</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${pendientes.length === 0 ? "bg-brand text-white" : "bg-warn/20 text-warn border border-warn/40"}`}>
                  {alDia.length} de {alDia.length + pendientes.length} hechas
                </span>
              </div>
              <p className="text-xs text-ink-subtle mb-3">{NORMA}</p>
              {pendientes.length === 0 ? (
                <p className="text-sm text-brand">Todas al día ✓</p>
              ) : (
                <>
                  <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-1.5">Sin hacer ({pendientes.length})</p>
                  <p className="text-sm text-ink mb-3">{pendientes.join(" · ")}</p>
                </>
              )}
              {alDia.length > 0 && (
                <>
                  <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-1.5">Hechas ({alDia.length})</p>
                  <p className="text-sm text-ink-muted">{alDia.join(" · ")}</p>
                </>
              )}
            </div>
          ) : (
            <div className={`rounded-2xl border px-4 py-3.5 mb-3.5 ${hechaEstaQuincena ? "border-brand/30 bg-brand-soft" : "border-warn/30 bg-warn-soft"}`}>
              <p className={`text-sm font-extrabold ${hechaEstaQuincena ? "text-brand-dark" : "text-warn"}`}>
                {hechaEstaQuincena
                  ? `Revisión del ${periodo.etiqueta} hecha ✓`
                  : `Te falta la revisión del ${periodo.etiqueta}`}
              </p>
              <p className={`text-xs mt-0.5 ${hechaEstaQuincena ? "text-brand-dark/80" : "text-warn/90"}`}>
                {hechaEstaQuincena
                  ? "Las revisiones son el día 1 y el día 15 de cada mes."
                  : "Peso y tres fotos: frente, perfil y espaldas."}
              </p>
            </div>
          )}

          {!admin && (
            <div className="flex flex-col gap-3.5 mb-5">
              <ProgressSummary
                total={mine.length}
                streak={streak}
                firstWeight={firstWeight}
                lastWeight={lastWeight}
                weightDelta={weightDelta}
                goalWeight={goalWeight}
                firstWaist={firstWaist}
                lastWaist={lastWaist}
                beforePhoto={beforePhoto}
                afterPhoto={afterPhoto}
                beforeDate={firstWithFront ? fmt(firstWithFront.created_at) : undefined}
                afterDate={lastWithFront ? fmt(lastWithFront.created_at) : undefined}
              />
              {points.length >= 2 && (
                <div className="card-dark !p-4 !transform-none">
                  <p className="text-[11.5px] font-bold text-ink-muted tracking-wide mb-2">Tu peso</p>
                  <WeightChart points={points} />
                </div>
              )}
              <CheckinForm plegado={mine.length > 0} />
            </div>
          )}

          {!admin && items.length > 0 && (
            <p className="text-[11.5px] font-bold text-ink-muted tracking-wide px-0.5 mb-2">Anteriores</p>
          )}

          {admin && !filtrada && fichas.length > 0 && <CheckinsBuscador fichas={fichas} />}

          {admin && filtrada && (
            <div className="card-dark p-6 !transform-none mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="min-w-0">
                  <h2 className="font-bold text-ink truncate">{nombreElegida}</h2>
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
                  <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">Peso</p>
                  <WeightChart points={puntosClienta} />
                </div>
              )}

              {/* Desde la primera hasta la última: el balance de todo el servicio. */}
              {cronologicas.length >= 2 && (
                <div>
                  <p className="text-xs font-bold text-ink-subtle uppercase tracking-wide mb-2">
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

              <p className="text-[11px] text-ink-subtle mt-3">
                Azul lo que baja, rojo lo que sube, gris lo que se queda igual. Siempre.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {items.length === 0 ? (
              <p className="text-sm text-ink-muted">{admin ? "Aún no hay check-ins." : "Tu primer check-in aparecerá aquí."}</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="card-dark !p-4 !transform-none">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-3">
                      {admin && !filtrada && (
                        <Link href={`/miembros/checkins?clienta=${encodeURIComponent(it.member_email)}`}
                          className="min-h-[40px] inline-flex items-center text-sm font-bold text-ink hover:text-brand">
                          {nombres.get(it.member_email) ?? it.member_email}
                        </Link>
                      )}
                      {admin && filtrada && (
                        <span className="text-xs font-bold text-ink-subtle">
                          Revisión {(posicion.get(it.id) ?? 0) + 1} de {cronologicas.length}
                        </span>
                      )}
                      {it.weight != null && (
                        <span className={admin ? "text-sm font-bold text-brand" : "text-base font-extrabold text-ink"}>{it.weight} kg</span>
                      )}
                    </div>
                    <span className="text-xs text-ink-muted">{fmt(it.created_at)}</span>
                  </div>
                  {it.note && <p className="text-sm text-ink-muted whitespace-pre-wrap mb-3">{it.note}</p>}
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
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {MEASURE_LABELS.filter((m) => it[m.key] != null).map((m) => (
                        <span key={m.key} className="text-[11.5px] text-ink-muted rounded-lg bg-page px-2.5 py-1.5">
                          {m.label} <span className="text-ink font-bold">{it[m.key] as number} cm</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {it.photos.length > 0 && <PhotoLightbox photos={it.photos} />}
                  {it.coach_reply ? (
                    <div className="mt-3 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3">
                      <p className="text-xs font-bold text-brand mb-1">Respuesta de tu coach</p>
                      <p className="text-sm text-ink whitespace-pre-wrap">{it.coach_reply}</p>
                    </div>
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
