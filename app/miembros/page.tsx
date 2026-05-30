import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CallCountdown from "@/components/CallCountdown";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { PROFILE_FIELDS, type Questionnaire } from "@/lib/profile";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Área de miembros",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Profile = { display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null };

function Card({ title, desc, children }: { title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="card-dark p-6 !transform-none flex flex-col">
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#A0A0A0] mb-4 flex-1">{desc}</p>
      {children}
    </div>
  );
}

export default async function MiembrosPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  const admin = isAdmin(email);

  let profile: Profile | null = null;
  try {
    profile = (await sbSelect<Profile>("profiles", `select=display_name,photo_path,questionnaire&email=eq.${encodeURIComponent(email)}`))[0] ?? null;
  } catch (e) { console.error("[dashboard] profile", e); }

  const name = profile?.display_name || email.split("@")[0];
  const photoUrl = profile?.photo_path ? await sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : undefined;

  // Progreso del perfil (solo clientas)
  const q = profile?.questionnaire ?? {};
  const answered = PROFILE_FIELDS.filter((f) => (q[f.id] ?? "").toString().trim() !== "").length;
  const totalSteps = PROFILE_FIELDS.length + 2; // + foto + nombre
  const done = answered + (profile?.photo_path ? 1 : 0) + (profile?.display_name ? 1 : 0);
  const pct = Math.round((done / totalSteps) * 100);
  const showNudge = !admin && pct < 100;

  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }} />
        <div className="container-wide relative z-10 py-16">
          {/* Saludo personalizado */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#161616] border border-[#252525] flex items-center justify-center shrink-0">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-[#666666]">{name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h1 className="section-title leading-tight">Hola, {name} 👋</h1>
                <p className="text-sm text-[#666666] mt-0.5">{admin ? "Panel de coach" : "Bienvenida a tu área privada"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {admin && <Link href="/miembros/admin" className="btn-brand text-sm px-5 py-2.5">Panel de la coach</Link>}
              <a href="/api/miembros/salir" className="btn-outline text-sm px-5 py-2.5">Cerrar sesión</a>
            </div>
          </div>

          {/* Nudge: completar perfil */}
          {showNudge && (
            <div className="card-dark p-6 !transform-none border-[#CAFF00]/30 mb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                <div>
                  <h3 className="font-bold text-white">Completa tu perfil ({pct}%)</h3>
                  <p className="text-sm text-[#A0A0A0]">Necesitamos tus datos y tu foto para crear tu plan y verte en la comunidad.</p>
                </div>
                <Link href="/miembros/perfil" className="btn-brand text-sm px-5 py-2.5">Completar ahora</Link>
              </div>
              <div className="h-2 w-full rounded-full bg-[#1c1c1c] overflow-hidden">
                <div className="h-full rounded-full bg-[#CAFF00] transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <div className="mb-5"><CallCountdown /></div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            <Card title="Mi perfil" desc="Tu cuestionario, tu foto y tus planes de nutrición y entrenamiento.">
              <Link href="/miembros/perfil" className="btn-brand text-sm px-6 py-3">Abrir mi perfil</Link>
            </Card>
            <Card title="Contenido y recursos" desc="Tus guías, vídeos y material del programa, alojado en la plataforma.">
              <Link href="/miembros/contenido" className="btn-brand text-sm px-6 py-3">Abrir contenido</Link>
            </Card>
            <Card title="Chat con tu coach" desc="Tu canal privado 1:1 con Aurena. Escríbele cuando lo necesites.">
              <Link href="/miembros/chat" className="btn-brand text-sm px-6 py-3">Abrir chat</Link>
            </Card>
            <Card title="Comunidad" desc="Comparte tus wins y recetas, y dale me gusta a las demás.">
              <Link href="/miembros/comunidad" className="btn-brand text-sm px-6 py-3">Ir a la comunidad</Link>
            </Card>
            <Card title="Seguimiento / check-ins" desc="Sube tu peso, fotos y notas, y sigue tu progreso con tu gráfica.">
              <Link href="/miembros/checkins" className="btn-brand text-sm px-6 py-3">Ir a mis check-ins</Link>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
