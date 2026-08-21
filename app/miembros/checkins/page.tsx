import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CheckinForm from "@/components/CheckinForm";
import AdminCheckinReply from "@/components/AdminCheckinReply";
import WeightChart from "@/components/WeightChart";
import ProgressSummary from "@/components/ProgressSummary";
import PhotoLightbox from "@/components/PhotoLightbox";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl, sbSignedThumb } from "@/lib/supabase";
import { periodoDe, todayMadrid, NORMA } from "@/lib/revisiones";

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

export default async function CheckinsPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  // Check-ins y objetivo de peso (cuestionario) en paralelo: son independientes.
  const q = admin
    ? "select=*&order=created_at.desc&limit=50"
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
  if (admin) {
    try {
      const [profs, hechas] = await Promise.all([
        sbSelect<{ email: string; display_name: string | null; access_revoked: boolean | null }>(
          "profiles", "select=email,display_name,access_revoked"
        ),
        sbSelect<{ member_email: string }>("check_ins", `select=member_email&created_at=gte.${periodo.inicio}T00:00:00`),
      ]);
      const yaEstan = new Set(hechas.map((h) => h.member_email));
      for (const p of profs) {
        if (p.access_revoked === true || isAdmin(p.email)) continue;
        (yaEstan.has(p.email) ? alDia : pendientes).push(p.display_name || p.email);
      }
      pendientes.sort(); alDia.sort();
    } catch (e) { console.error("[checkins] pendientes", e); }
  }

  const items = await withPhoto(admin ? rows : [...rows].reverse());
  // Solo pesos numéricos válidos (un valor corrupto nunca debe romper la gráfica).
  const points = (admin ? [] : rows)
    .map((r) => ({ date: fmt(r.created_at), weight: Number(r.weight) }))
    .filter((p) => Number.isFinite(p.weight));

  // Resumen de progreso (solo clienta). rows viene en orden ascendente.
  const mine = admin ? [] : rows;
  const validWeights = mine.map((r) => Number(r.weight)).filter((w) => Number.isFinite(w));
  const firstWeight = validWeights.length ? validWeights[0] : null;
  const lastWeight = validWeights.length ? validWeights[validWeights.length - 1] : null;
  const weightDelta =
    firstWeight != null && lastWeight != null ? Math.round((lastWeight - firstWeight) * 10) / 10 : null;
  const streak = admin ? 0 : weeklyStreak(mine.map((r) => r.created_at));
  // Cintura: primera vs última medida registrada (medida estrella del progreso).
  const waists = mine.map((r) => Number(r.waist)).filter((w) => Number.isFinite(w));
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
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">{admin ? "Check-ins (todas)" : "Mis check-ins"}</h1>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {/* Estado de la quincena en curso. A la clienta le dice si le falta la
              suya; a la coach, quién la ha hecho y quién no. */}
          {admin ? (
            <div className="card-dark p-5 !transform-none mb-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <h2 className="font-bold text-white">Revisión del {periodo.etiqueta}</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${pendientes.length === 0 ? "bg-[#1CA0E3] text-white" : "bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40"}`}>
                  {alDia.length} de {alDia.length + pendientes.length} hechas
                </span>
              </div>
              <p className="text-xs text-[#666666] mb-3">{NORMA}</p>
              {pendientes.length === 0 ? (
                <p className="text-sm text-[#1CA0E3]">Todas al día ✓</p>
              ) : (
                <>
                  <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-1.5">Sin hacer ({pendientes.length})</p>
                  <p className="text-sm text-white mb-3">{pendientes.join(" · ")}</p>
                </>
              )}
              {alDia.length > 0 && (
                <>
                  <p className="text-xs font-bold text-[#666666] uppercase tracking-wide mb-1.5">Hechas ({alDia.length})</p>
                  <p className="text-sm text-[#A0A0A0]">{alDia.join(" · ")}</p>
                </>
              )}
            </div>
          ) : (
            <div className={`rounded-xl border px-5 py-4 mb-8 ${hechaEstaQuincena ? "border-[#1CA0E3]/40 bg-[#1CA0E3]/5" : "border-[#FFB800]/40 bg-[#FFB800]/5"}`}>
              <p className={`text-sm font-bold ${hechaEstaQuincena ? "text-[#1CA0E3]" : "text-[#FFB800]"}`}>
                {hechaEstaQuincena
                  ? `Revisión del ${periodo.etiqueta} hecha ✓`
                  : `Te falta la revisión del ${periodo.etiqueta}`}
              </p>
              <p className="text-xs text-[#A0A0A0] mt-1">
                {NORMA} {hechaEstaQuincena
                  ? "La próxima te tocará en la siguiente fecha."
                  : "Sube tu peso y tus 3 fotos (frente, perfil y espaldas)."}
              </p>
            </div>
          )}

          {!admin && (
            <>
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
              <div className="grid gap-6 lg:grid-cols-2 mb-8">
                <CheckinForm />
                <div className="card-dark p-6 !transform-none">
                  <h3 className="font-bold text-white mb-4">Tu progreso (peso)</h3>
                  <WeightChart points={points} />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <p className="text-[#A0A0A0]">{admin ? "Aún no hay check-ins." : "Todavía no has registrado ningún check-in."}</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="card-dark p-5 !transform-none">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-3">
                      {admin && <span className="text-sm font-bold text-white">{it.member_email}</span>}
                      {it.weight != null && (
                        <span className="text-sm font-bold text-[#1CA0E3]">{it.weight} kg</span>
                      )}
                    </div>
                    <span className="text-xs text-[#666666]">{fmt(it.created_at)}</span>
                  </div>
                  {it.note && <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap mb-3">{it.note}</p>}
                  {MEASURE_LABELS.some((m) => it[m.key] != null) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {MEASURE_LABELS.filter((m) => it[m.key] != null).map((m) => (
                        <span key={m.key} className="text-xs text-[#A0A0A0] rounded-lg border border-[#252525] bg-[#141414] px-2.5 py-1">
                          {m.label}: <span className="text-white font-semibold">{it[m.key] as number} cm</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {it.photos.length > 0 && <PhotoLightbox photos={it.photos} />}
                  {it.coach_reply ? (
                    <div className="mt-3 rounded-lg border border-[#1CA0E3]/30 bg-[#1CA0E3]/5 px-4 py-3">
                      <p className="text-xs font-bold text-[#1CA0E3] mb-1">Respuesta de tu coach</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{it.coach_reply}</p>
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
