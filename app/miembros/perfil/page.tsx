import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import type { Questionnaire } from "@/lib/profile";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null };
type Plan = { id: string; type: "nutricion" | "entrenamiento"; title: string | null; file_path: string; created_at: string };

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

          {/* Mi plan (solo clientas) */}
          {!admin && (
          <div className="card-dark p-6 !transform-none mb-8">
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
          )}

          <ProfileForm
            initialName={profile?.display_name ?? ""}
            initialQuestionnaire={profile?.questionnaire ?? {}}
            photoUrl={photoUrl}
            admin={admin}
          />
        </div>
      </main>
    </>
  );
}
