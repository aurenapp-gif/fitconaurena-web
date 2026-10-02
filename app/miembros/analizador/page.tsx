import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Analizador from "@/components/Analizador";
import EstrategiaDelMes from "@/components/EstrategiaDelMes";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect } from "@/lib/supabase";
import { hoyMadrid } from "@/lib/renovaciones";
import { analizar, resumenCorto, type Habito, type Revision, type Serie } from "@/lib/analisis";
import { objetivoDe } from "@/lib/progreso";
import { edadDe } from "@/lib/profile";

export const metadata: Metadata = { title: "Analizador", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * El analizador, clienta a clienta. Solo la coach.
 *
 * Se mira UNA clienta cada vez, no todas a la vez, por una razón concreta:
 * Supabase corta cualquier respuesta en 1.000 filas sin avisar, y con los
 * entrenos y los hábitos de veinticinco clientas se pasa de ahí. Un analizador
 * que calcula con la mitad de los datos y no lo dice es peor que no tenerlo.
 */
export default async function AnalizadorPage({ searchParams }: { searchParams?: { clienta?: string } }) {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!isAdmin(me)) redirect("/miembros");

  const elegida = searchParams?.clienta ? normalizeEmail(searchParams.clienta) : "";
  const hay = elegida !== "" && isValidEmail(elegida);

  const [members, perfiles] = await Promise.all([
    getMembers().then((ms) => ms.filter((m) => !isAdmin(m.email))).catch(() => [] as { email: string; name: string }[]),
    sbSelect<{ email: string; display_name: string | null }>("profiles", "select=email,display_name").catch(() => []),
  ]);
  const nombreDe = new Map(perfiles.map((p) => [p.email, p.display_name?.trim() || ""]));
  const clientas = members
    .map((m) => ({ email: m.email, nombre: nombreDe.get(m.email) || m.name || m.email }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  let hallazgos: ReturnType<typeof analizar> = [];
  let nombre = "";
  if (hay) {
    const e = encodeURIComponent(elegida);
    const desde = new Date(Date.now() - 70 * 86400000).toISOString();
    const [perfil, revisiones, habitos, series, planNutri] = await Promise.all([
      sbSelect<{ questionnaire: Record<string, string> | null; steps_target: number | null; display_name: string | null }>(
        "profiles", `select=questionnaire,steps_target,display_name&email=eq.${e}`
      ).then((r) => r[0] ?? null).catch(() => null),
      sbSelect<Revision>("check_ins", `select=created_at,weight,waist&member_email=eq.${e}&order=created_at.asc`)
        .catch(() => [] as Revision[]),
      sbSelect<Habito>("habit_logs", `select=day,steps,sleep,cycle_day&member_email=eq.${e}&day=gte.${desde.slice(0, 10)}&order=day.asc`)
        .catch(() => [] as Habito[]),
      sbSelect<Serie>("workout_sets", `select=ejercicio,peso,reps,created_at&member_email=eq.${e}&created_at=gte.${desde}&order=created_at.desc&limit=1000`)
        .catch(() => [] as Serie[]),
      // Su plan de alimentación vigente, con lo que le pauta de comer. Si aún
      // no existen esas columnas (falta supabase/nutricion.sql) se pide sin
      // ellas, para que el resto del analizador siga funcionando.
      sbSelect<{ kcal: number | null; protein_g: number | null }>(
        "plans", `select=kcal,protein_g&member_email=eq.${e}&type=eq.nutricion&order=created_at.desc&limit=1`
      ).then((r) => ({ fila: r[0] ?? null, hayPlan: r.length > 0 }))
        .catch(() =>
          sbSelect<{ id: string }>("plans", `select=id&member_email=eq.${e}&type=eq.nutricion&limit=1`)
            .then((r) => ({ fila: null, hayPlan: r.length > 0 }))
            .catch(() => ({ fila: null, hayPlan: false }))
        ),
    ]);
    nombre = perfil?.display_name?.trim() || clientas.find((c) => c.email === elegida)?.nombre || elegida;
    hallazgos = analizar({
      objetivo: objetivoDe(perfil?.questionnaire ?? null),
      revisiones,
      habitos,
      series,
      alturaCm: Number(perfil?.questionnaire?.altura) || null,
      edad: edadDe(perfil?.questionnaire?.fecha_nacimiento),
      nutricion: {
        kcal: planNutri.fila?.kcal ?? null,
        proteina: planNutri.fila?.protein_g ?? null,
        tienePlan: planNutri.hayPlan,
      },
      pasosObjetivo: perfil?.steps_target ?? null,
      hoy: hoyMadrid(),
    });
  }

  return (
    <>
      <AppShell admin />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <span className="section-tag">Solo administración</span>
          <h1 className="section-title mb-1">Analizador</h1>
          <p className="text-sm text-ink-subtle mb-6">
            Qué está frenando los resultados de cada clienta, con el umbral y el estudio del que sale.
            Son reglas sobre sus datos, no una opinión: los mismos datos dan siempre lo mismo.
          </p>

          <div className="card-dark p-5 !transform-none mb-6">
            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-3">Elige clienta</p>
            <div className="flex flex-wrap gap-2">
              {clientas.map((c) => (
                <Link key={c.email} href={`/miembros/analizador?clienta=${encodeURIComponent(c.email)}`}
                  className={`text-sm px-3 py-2 rounded-xl border ${c.email === elegida ? "bg-brand text-white border-brand" : "border-line text-ink hover:border-brand"}`}>
                  {c.nombre}
                </Link>
              ))}
              {clientas.length === 0 && <p className="text-sm text-ink-muted">No hay clientas todavía.</p>}
            </div>
          </div>

          {hay && (
            <div className="card-dark p-6 !transform-none">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-ink">{nombre}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-page text-ink-muted">{resumenCorto(hallazgos)}</span>
                  <Link href={`/miembros/checkins?clienta=${encodeURIComponent(elegida)}`} className="btn-outline text-xs px-4 py-2">
                    Ver sus revisiones
                  </Link>
                </div>
              </div>
              <Analizador hallazgos={hallazgos} />
            </div>
          )}

          {hay && (
            <div className="card-dark p-6 !transform-none mt-6">
              <h2 className="font-bold text-ink mb-1">Estrategia del mes</h2>
              <p className="text-xs text-ink-subtle mb-4">
                Escríbelo o díctalo, y sale un PDF para mandárselo por WhatsApp.
              </p>
              <EstrategiaDelMes
                email={elegida}
                nombre={nombre}
                sugerencias={hallazgos
                  .filter((x) => x.prioridad === "alta" || x.prioridad === "media")
                  .map((x) => x.quehacer)}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
