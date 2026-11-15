import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import MisTareas from "@/components/MisTareas";
import SetupSql from "@/components/SetupSql";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { cookies } from "next/headers";
import { esEquipo, puedeGestionarClientas } from "@/lib/equipo";
import { isMissingTable, sbSelect } from "@/lib/supabase";
import { hoyMadrid } from "@/lib/renovaciones";
import { SETUP_SQL, type Tarea } from "@/lib/tareas";

export const metadata: Metadata = { title: "Tareas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Las tareas del día de quien entra.
 *
 * Es del equipo, no de las clientas: `requireMember` no vale aquí porque
 * dejaría entrar a cualquiera. Se comprueba a mano.
 */
export default async function TareasPage() {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  const ceo = isAdmin(me);
  if (!ceo && !(await esEquipo(me))) redirect("/miembros");

  const dia = hoyMadrid();
  let tareas: Tarea[] = [];
  let hechasHoy: string[] = [];
  let faltaSql = false;
  try {
    const [t, h] = await Promise.all([
      sbSelect<Tarea>("staff_tasks", "select=id,titulo,detalle,asignado_a,prioridad,activa,created_at&activa=is.true"),
      sbSelect<{ task_id: string }>(
        "staff_task_done",
        `select=task_id&email=eq.${encodeURIComponent(me.toLowerCase())}&dia=eq.${dia}`
      ),
    ]);
    tareas = t;
    hechasHoy = h.map((x) => x.task_id);
  } catch (e) {
    if (isMissingTable(e)) faltaSql = true;
    else console.error("[tareas]", e);
  }

  return (
    <>
      <AppShell admin={await puedeGestionarClientas(me)} ceo={ceo} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <h1 className="page-title mb-1">Tareas</h1>
          <p className="text-[15px] text-ink-muted mb-5">Lo de hoy, en el orden en que toca hacerlo.</p>

          {faltaSql ? (
            ceo
              ? <SetupSql title="Falta un paso para poder poner tareas" sql={SETUP_SQL} />
              : <p className="text-[15px] text-ink-muted">Las tareas todavía no están activadas.</p>
          ) : (
            <MisTareas tareas={tareas} hechasHoy={hechasHoy} email={me} />
          )}
        </div>
      </main>
    </>
  );
}
