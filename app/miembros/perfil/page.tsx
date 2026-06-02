import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import PushToggle from "@/components/PushToggle";
import PwaInstall from "@/components/PwaInstall";
import PerfilTabs from "@/components/PerfilTabs";
import HabitsTracker from "@/components/HabitsTracker";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import type { Questionnaire } from "@/lib/profile";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null; questionnaire_completed_at: string | null };
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; file_path: string; created_at: string };
type HabitRow = { day: string; water: number | null; steps: number | null; sleep: number | null };

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

  let profile: Profile | null = null;
  let plans: Plan[] = [];
  try {
    const rows = await sbSelect<Profile>("profiles", `select=*&email=eq.${encodeURIComponent(email)}`);
    profile = rows[0] ?? null;
  } catch (e) { console.error("[perfil] profile", e); }
  try {
    plans = await sbSelect<Plan>("plans", `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.desc`);
  } catch (e) { console.error("[perfil] plans", e); }

  const latest = (t: string) => plans.find((p) => p.type === t);
  const nut = latest("nutricion");
  const ent = latest("entrenamiento");
  const nutUrl = nut ? await sbSignedUrl("planes", nut.file_path, 3600).catch(() => undefined) : undefined;
  const entUrl = ent ? await sbSignedUrl("planes", ent.file_path, 3600).catch(() => undefined) : undefined;
  const photoUrl = profile?.photo_path ? await sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : undefined;

  // Hábitos (solo clientas): registro de hoy, racha y últimos 7 días.
  let habitRows: HabitRow[] = [];
  if (!admin) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    try {
      habitRows = await sbSelect<HabitRow>(
        "habit_logs",
        `select=day,water,steps,sleep&member_email=eq.${encodeURIComponent(email)}&day=gte.${since}&order=day.asc`
      );
    } catch (e) { console.error("[perfil] habits", e); }
  }
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
          <p className="font-bold text-white mb-1">🥗 Nutrición</p>
          {nutUrl ? (
            <a href={nutUrl} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-5 py-2.5 mt-2 inline-flex">Ver plan</a>
          ) : (
            <p className="text-sm text-[#666666]">Tu coach aún no ha subido tu plan de nutrición.</p>
          )}
        </div>
        <div className="rounded-xl border border-[#252525] p-4">
          <p className="font-bold text-white mb-1">🏋️ Entrenamiento</p>
          {entUrl ? (
            <a href={entUrl} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-5 py-2.5 mt-2 inline-flex">Ver plan</a>
          ) : (
            <p className="text-sm text-[#666666]">Tu coach aún no ha subido tu plan de entrenamiento.</p>
          )}
        </div>
      </div>
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
                { id: "habitos", icon: "🔥", label: "Hábitos", node: <HabitsTracker initial={habitToday} streak={habitStreak} last7={last7} /> },
                { id: "ajustes", icon: "⚙️", label: "Ajustes", node: <div className="flex flex-col gap-6"><PushToggle /><PwaInstall /></div> },
              ]}
            />
          )}
        </div>
      </main>
    </>
  );
}
