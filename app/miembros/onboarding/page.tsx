import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import VideoOnboarding from "@/components/VideoOnboarding";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import { onboardingDisponible } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Onboarding", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const email = await requireMember();
  const admin = isAdmin(email);
  const videos = onboardingDisponible();

  // Cuáles ha visto ya, para no hacerle contar de memoria.
  const vistos = new Set(
    (await sbSelect<{ detail: string | null }>(
      "activity_log",
      `select=detail&member_email=eq.${encodeURIComponent(email)}&action=eq.onboarding_visto`
    ).catch(() => [])).map((r) => r.detail).filter((d): d is string => !!d)
  );

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <Link href="/miembros" className="text-[16px] text-brand">‹ Inicio</Link>
          <h1 className="page-title mt-2 mb-1">Onboarding</h1>
          <p className="text-[15px] text-ink-muted mb-6">
            {videos.length === 0
              ? "Tu coach está preparando los vídeos. En cuanto estén, aparecen aquí."
              : "Tres vídeos para empezar con las ideas claras. Se ven en cualquier orden, pero el primero es el primero por algo."}
          </p>

          <div className="flex flex-col gap-7">
            {videos.map((v, i) => (
              <div key={v.id} className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[13px] font-semibold text-ink-subtle tabular-nums">{i + 1}</span>
                  <div className="min-w-0">
                    <h2 className="text-[19px] font-bold leading-tight">
                      {v.titulo}
                      {vistos.has(v.id) && <span className="ml-2 text-[13px] font-semibold text-success align-middle">visto</span>}
                    </h2>
                    <p className="text-[15px] text-ink-muted mt-0.5">{v.descripcion}</p>
                  </div>
                </div>
                <VideoOnboarding url={v.url} titulo={v.titulo} id={v.id} visto={vistos.has(v.id)} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
