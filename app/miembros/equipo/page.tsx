import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Equipo from "@/components/Equipo";
import SetupSql from "@/components/SetupSql";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { listaEquipo, SETUP_SQL, type DelEquipo } from "@/lib/equipo";
import { isMissingTable } from "@/lib/supabase";

export const metadata: Metadata = { title: "Equipo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** El equipo que trabaja con las clientas. Solo el CEO reparte permisos. */
export default async function EquipoPage() {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!isAdmin(me)) redirect("/miembros");

  let equipo: DelEquipo[] = [];
  let faltaTabla = false;
  try {
    equipo = await listaEquipo();
  } catch (e) {
    if (isMissingTable(e)) faltaTabla = true;
    else console.error("[equipo] listar", e);
  }

  return (
    <>
      <AppShell admin />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <span className="section-tag">Solo tú</span>
          <h1 className="section-title mb-1">Equipo</h1>
          <p className="text-[15px] text-ink-muted mb-6">
            Entrenadores y nutricionistas que trabajan con tus clientas. Entran con su propio correo,
            con el mismo código de siempre.
          </p>

          <div className="card-dark p-6 !transform-none">
            {faltaTabla ? (
              <SetupSql title="Falta un paso para poder dar de alta al equipo" sql={SETUP_SQL} />
            ) : (
              <Equipo inicial={equipo} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
