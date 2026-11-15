import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Equipo from "@/components/Equipo";
import SetupSql from "@/components/SetupSql";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { listaEquipo, SETUP_SQL, type DelEquipo } from "@/lib/equipo";
import TareasEquipo from "@/components/TareasEquipo";
import { SETUP_SQL as TAREAS_SQL, type Tarea } from "@/lib/tareas";
import { sbSelect } from "@/lib/supabase";
import { hoyMadrid } from "@/lib/renovaciones";
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

  // Las tareas del equipo y quién las lleva hechas hoy.
  let tareas: Tarea[] = [];
  let hechasHoy: Record<string, string[]> = {};
  let faltanTareas = false;
  try {
    const hoy = hoyMadrid();
    const [t, h] = await Promise.all([
      sbSelect<Tarea>("staff_tasks", "select=id,titulo,detalle,asignado_a,prioridad,activa,created_at&activa=is.true"),
      sbSelect<{ task_id: string; email: string }>("staff_task_done", `select=task_id,email&dia=eq.${hoy}`),
    ]);
    tareas = t;
    hechasHoy = h.reduce<Record<string, string[]>>((acc, x) => {
      (acc[x.task_id] ??= []).push(x.email);
      return acc;
    }, {});
  } catch (e) {
    if (isMissingTable(e)) faltanTareas = true;
    else console.error("[equipo] tareas", e);
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

          {/* Las tareas del día. Van aquí y no en otra pantalla porque se
              ponen mirando a quién se las pones, que es esta lista. */}
          <h2 className="section-title text-xl mt-10 mb-1">Tareas del equipo</h2>
          <p className="text-[15px] text-ink-muted mb-4">
            Lo que tienen que hacer cada día. Lo marcan ellos desde su propio «Tareas», y el orden
            manda: la primera de la lista es la primera que toca.
          </p>
          <div className="card-dark p-6 !transform-none">
            {faltanTareas ? (
              <SetupSql title="Falta un paso para poder poner tareas" sql={TAREAS_SQL} />
            ) : (
              <TareasEquipo
                tareas={tareas}
                equipo={equipo.filter((q) => q.activo).map((q) => ({ email: q.email, nombre: q.nombre || q.email }))}
                hechasHoy={hechasHoy}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
