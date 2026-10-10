import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import FitAI from "@/components/FitAI";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import { periodoDe, proximaRevision, todayMadrid } from "@/lib/revisiones";
import { diaDe } from "@/lib/renovaciones";

export const metadata: Metadata = { title: "FitAI", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function FitAIPage() {
  const email = await requireMember();
  const admin = isAdmin(email);
  const e = encodeURIComponent(email);
  const hoy = todayMadrid();

  const [perfil, ultima] = await Promise.all([
    sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${e}`)
      .then((r) => r[0] ?? null).catch(() => null),
    sbSelect<{ created_at: string }>("check_ins", `select=created_at&member_email=eq.${e}&order=created_at.desc&limit=1`)
      .then((r) => r[0]?.created_at ?? null).catch(() => null),
  ]);

  const nombre = perfil?.display_name || email.split("@")[0];
  const pendiente = proximaRevision(hoy, !!ultima && diaDe(ultima) >= periodoDe(hoy).inicio).pendiente;

  // Tres preguntas para arrancar. La primera cambia según le toque revisión,
  // porque es la duda del momento.
  const sugerencias = [
    pendiente ? "¿Qué tengo que subir en la revisión?" : "¿Cuándo es mi próxima revisión?",
    "¿Cuándo es la llamada de grupo?",
    "¿Cada cuánto me cambian el plan?",
  ];

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <h1 className="page-title mb-1">FitAI</h1>
          <p className="text-[15px] text-ink-muted mb-5">Tus dudas del programa, resueltas al momento y a cualquier hora.</p>
          <FitAI nombre={nombre} sugerencias={sugerencias} />

          {/* La salida cuando la IA no llega. Antes «Dudas» era otra pestaña
              del menú y se escribieron tres en toda la historia del programa;
              aquí está en el momento en que de verdad hace falta. */}
          {!admin && (
            <Link href="/miembros/dudas"
              className="mt-5 flex items-center justify-between gap-3 rounded-[14px] bg-surface px-4 py-3.5">
              <span className="min-w-0">
                <span className="block text-[15px] text-ink">¿No te lo resuelve?</span>
                <span className="block text-[13px] text-ink-muted">
                  Pregúntaselo a tu coach sin dar la cara: nadie sabe quién ha escrito cada duda.
                </span>
              </span>
              <span className="text-ink-subtle shrink-0">›</span>
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
