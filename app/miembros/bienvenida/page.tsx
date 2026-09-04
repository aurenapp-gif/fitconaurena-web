import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import WelcomeForm from "@/components/WelcomeForm";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { memberState } from "@/lib/guard";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Bienvenida", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Pantalla inicial obligatoria al entrar por primera vez. No usa requireMember
 * para no entrar en un bucle de redirecciones (ese guard redirige justo aquí).
 */
export default async function BienvenidaPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");

  const state = await memberState(email);
  if (state.revoked) redirect("/miembros/acceso?revoked=1");
  // Si ya la completó (o es la coach), no hay nada que hacer aquí.
  if (!state.needsOnboarding) redirect("/miembros");

  let name = "";
  try {
    const rows = await sbSelect<{ display_name: string | null }>(
      "profiles",
      `select=display_name&email=eq.${encodeURIComponent(email)}`
    );
    name = rows[0]?.display_name ?? "";
  } catch (e) { console.error("[bienvenida] perfil", e); }

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="max-w-xl">
            <span className="section-tag">Bienvenida</span>
            <h1 className="section-title">Vamos a preparar tu espacio</h1>
            <p className="text-sm text-ink-muted mt-2 mb-8">
              Solo un minuto: pon tu nombre y una foto para que tu coach te reconozca. Después
              entrarás a tu área privada.
            </p>

            <div className="card-dark p-6 !transform-none">
              <WelcomeForm initialName={isAdmin(email) ? "" : name} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
