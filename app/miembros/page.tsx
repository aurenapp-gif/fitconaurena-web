import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CallCountdown from "@/components/CallCountdown";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { questionnaireComplete, type Questionnaire } from "@/lib/profile";
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
  const email = await requireMember();
  const admin = isAdmin(email);

  let profile: Profile | null = null;
  try {
    profile = (await sbSelect<Profile>("profiles", `select=display_name,photo_path,questionnaire&email=eq.${encodeURIComponent(email)}`))[0] ?? null;
  } catch (e) { console.error("[dashboard] profile", e); }

  const name = profile?.display_name || email.split("@")[0];

  // Foto + señal de la checklist de primeros pasos, en paralelo (independientes).
  const [photoUrl, checkinDone] = await Promise.all([
    profile?.photo_path ? sbSignedUrl("perfil", profile.photo_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
    admin ? Promise.resolve(false) : sbSelect("check_ins", `select=id&member_email=eq.${encodeURIComponent(email)}&limit=1`).then((r) => r.length > 0).catch(() => false),
  ]);

  // Misma fuente de verdad que el formulario y la API (no duplicar la lista).
  const quesDone = questionnaireComplete(profile?.questionnaire ?? {});
  const steps = [
    { label: "Sube tu foto de perfil", done: !!profile?.photo_path, href: "/miembros/perfil" },
    { label: "Completa tu cuestionario", done: quesDone, href: "/miembros/perfil" },
    { label: "Haz tu primer check-in", done: checkinDone, href: "/miembros/checkins" },
  ];
  const showChecklist = !admin && !steps.every((s) => s.done);

  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #1CA0E3 0%, transparent 70%)" }} />
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

          {/* Checklist de primeros pasos (desaparece al completarse) */}
          {showChecklist && (
            <div className="card-dark p-6 !transform-none border-[#1CA0E3]/30 mb-5">
              <h3 className="font-bold text-white mb-1">Tus primeros pasos</h3>
              <p className="text-sm text-[#A0A0A0] mb-4">
                Completa estos pasos para empezar con buen pie. {steps.filter((s) => s.done).length}/{steps.length} hechos.
              </p>
              <div className="flex flex-col gap-2">
                {steps.map((s) => (
                  <div key={s.label} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${s.done ? "border-[#252525] bg-[#0F0F0F]" : "border-[#252525] bg-[#0A0A0A]"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${s.done ? "bg-[#1CA0E3]" : "border-2 border-[#444]"}`}>
                        {s.done && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </span>
                      <span className={`text-sm ${s.done ? "text-[#666666] line-through" : "text-white"}`}>{s.label}</span>
                    </div>
                    {!s.done && (
                      <Link href={s.href} className="text-[#1CA0E3] text-sm font-semibold shrink-0">Hacerlo →</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* La URL de la sala se lee en el servidor y solo llega a quien tiene
              sesión válida (esta página está tras requireMember). */}
          <div className="mb-5">
            <CallCountdown callUrl={process.env.CALL_URL ?? process.env.NEXT_PUBLIC_CALL_URL ?? ""} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            <Card title="Mi perfil" desc="Tu cuestionario, tu foto y tus planes de nutrición y entrenamiento.">
              <Link href="/miembros/perfil" className="btn-brand text-sm px-6 py-3">Abrir mi perfil</Link>
            </Card>
            <Card title="Revisión de técnica" desc="Sube un vídeo corto de tu ejercicio y tu coach te corrige la técnica.">
              <Link href="/miembros/tecnica" className="btn-brand text-sm px-6 py-3">Subir vídeo de técnica</Link>
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
