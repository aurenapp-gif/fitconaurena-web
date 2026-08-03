import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import PushToggle from "@/components/PushToggle";
import PwaInstall from "@/components/PwaInstall";
import PerfilTabs from "@/components/PerfilTabs";
import HabitsTracker from "@/components/HabitsTracker";
import ContractSign from "@/components/ContractSign";
import FileViewer from "@/components/FileViewer";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import type { Questionnaire } from "@/lib/profile";
import { CONTRACT_BUCKET, type ContractTemplate, type ContractSignature } from "@/lib/contract";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null; questionnaire_completed_at: string | null };
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; note?: string | null; file_path: string; created_at: string };
type HabitRow = { day: string; water: number | null; steps: number | null; sleep: number | null };

/** Comentario que la coach deja junto al plan (indicaciones, cambios…). */
function PlanNote({ note }: { note?: string | null }) {
  if (!note) return null;
  return (
    <div className="mt-3 rounded-lg border border-[#1CA0E3]/30 bg-[#1CA0E3]/5 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#1CA0E3] mb-1">Nota de tu coach</p>
      <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{note}</p>
    </div>
  );
}

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

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // 1ª tanda: todo lo independiente en paralelo (una sola ida/vuelta, no en cascada).
  const [profile, plans, habitRows, contractTpl] = await Promise.all([
    sbSelect<Profile>("profiles", `select=*&email=eq.${encodeURIComponent(email)}`)
      .then((r) => r[0] ?? null)
      .catch((e) => { console.error("[perfil] profile", e); return null; }),
    sbSelect<Plan>("plans", `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.desc`)
      .catch((e) => { console.error("[perfil] plans", e); return [] as Plan[]; }),
    admin
      ? Promise.resolve([] as HabitRow[])
      : sbSelect<HabitRow>(
          "habit_logs",
          `select=day,water,steps,sleep&member_email=eq.${encodeURIComponent(email)}&day=gte.${since}&order=day.asc`
        ).catch((e) => { console.error("[perfil] habits", e); return [] as HabitRow[]; }),
    admin
      ? Promise.resolve(null)
      : sbSelect<ContractTemplate>("contract_template", "select=*&id=eq.1")
          .then((r) => r[0] ?? null)
          .catch((e) => { console.error("[perfil] contract template", e); return null; }),
  ]);

  const nut = plans.find((p) => p.type === "nutricion");
  const ent = plans.find((p) => p.type === "entrenamiento");

  // La firma depende de la versión de la plantilla, así que va después.
  let contractSig: ContractSignature | null = null;
  if (contractTpl) {
    contractSig = await sbSelect<ContractSignature>(
      "contract_signatures",
      `select=*&member_email=eq.${encodeURIComponent(email)}&version=eq.${contractTpl.version}`
    ).then((r) => r[0] ?? null).catch((e) => { console.error("[perfil] contract signature", e); return null; });
  }

  // 2ª tanda: todas las URLs firmadas en paralelo.
  const [nutUrl, entUrl, photoUrl, contractTplUrl, signedPdfUrl] = await Promise.all([
    nut ? sbSignedUrl("planes", nut.file_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
    ent ? sbSignedUrl("planes", ent.file_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
    profile?.photo_path ? sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
    contractTpl ? sbSignedUrl(CONTRACT_BUCKET, contractTpl.file_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
    contractSig?.signed_pdf_path ? sbSignedUrl(CONTRACT_BUCKET, contractSig.signed_pdf_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
  ]);

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
            <>
              {nut?.title && <p className="text-sm text-[#A0A0A0] mb-1">{nut.title}</p>}
              <FileViewer url={nutUrl} label="Plan de nutrición" />
              <PlanNote note={nut?.note} />
            </>
          ) : (
            <p className="text-sm text-[#666666]">Tu coach aún no ha subido tu plan de nutrición.</p>
          )}
        </div>
        <div className="rounded-xl border border-[#252525] p-4">
          <p className="font-bold text-white mb-1">🏋️ Entrenamiento</p>
          {entUrl ? (
            <>
              {ent?.title && <p className="text-sm text-[#A0A0A0] mb-1">{ent.title}</p>}
              <FileViewer url={entUrl} label="Plan de entrenamiento" />
              <PlanNote note={ent?.note} />
            </>
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
                { id: "contrato", icon: "📄", label: "Contrato", node: (
                  <ContractSign
                    hasTemplate={!!contractTpl}
                    templateUrl={contractTplUrl}
                    signed={!!contractSig}
                    signedAt={contractSig?.signed_at}
                    signedPdfUrl={signedPdfUrl}
                    defaultName={profile?.display_name ?? ""}
                  />
                ) },
                { id: "ajustes", icon: "⚙️", label: "Ajustes", node: <div className="flex flex-col gap-6"><PushToggle /><PwaInstall /></div> },
              ]}
            />
          )}
        </div>
      </main>
    </>
  );
}
