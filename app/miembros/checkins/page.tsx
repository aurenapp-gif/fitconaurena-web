import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CheckinForm from "@/components/CheckinForm";
import AdminCheckinReply from "@/components/AdminCheckinReply";
import WeightChart from "@/components/WeightChart";
import ProgressSummary from "@/components/ProgressSummary";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl, sbSignedThumb } from "@/lib/supabase";

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
};

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

  let rows: CheckIn[] = [];
  try {
    const q = admin
      ? "select=*&order=created_at.desc&limit=50"
      : `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc`;
    rows = await sbSelect<CheckIn>("check_ins", q);
  } catch (e) {
    console.error("[checkins] error", e);
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

          {!admin && (
            <>
              <ProgressSummary
                total={mine.length}
                streak={streak}
                firstWeight={firstWeight}
                lastWeight={lastWeight}
                weightDelta={weightDelta}
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
                        <span className="text-sm font-bold text-[#CAFF00]">{it.weight} kg</span>
                      )}
                    </div>
                    <span className="text-xs text-[#666666]">{fmt(it.created_at)}</span>
                  </div>
                  {it.note && <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap mb-3">{it.note}</p>}
                  {it.photos.length > 0 && (
                    <div className="flex gap-3 flex-wrap mb-1">
                      {it.photos.map((p, i) => (
                        <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.thumb} alt={p.label} loading="lazy" decoding="async" className="max-h-44 rounded-lg border border-[#252525]" />
                          <span className="block text-[10px] text-[#666666] mt-1">{p.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {it.coach_reply ? (
                    <div className="mt-3 rounded-lg border border-[#CAFF00]/30 bg-[#CAFF00]/5 px-4 py-3">
                      <p className="text-xs font-bold text-[#CAFF00] mb-1">Respuesta de tu coach</p>
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
