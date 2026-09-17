import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Asistente from "@/components/Asistente";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import { periodoDe, proximaRevision, todayMadrid } from "@/lib/revisiones";
import { diaDe } from "@/lib/renovaciones";

export const metadata: Metadata = { title: "Asistente", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AsistentePage() {
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
          <h1 className="page-title mb-1">Asistente</h1>
          <p className="text-[15px] text-ink-muted mb-5">Tus dudas del programa, resueltas al momento y a cualquier hora.</p>
          <Asistente nombre={nombre} sugerencias={sugerencias} />
        </div>
      </main>
    </>
  );
}
