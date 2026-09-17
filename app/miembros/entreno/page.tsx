import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Entreno from "@/components/Entreno";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import { leerPlan } from "@/lib/planes";
import { claveEjercicio, ultimaVezPorEjercicio, type SerieGuardada, type UltimaVez } from "@/lib/entrenos";
import { nombresDe } from "@/lib/entreno";
import type { DiaEntrenamiento } from "@/lib/plan-estructura";

export const metadata: Metadata = { title: "Entreno", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Plan = {
  id: string; type: string; title: string | null; file_path: string | null;
  contenido?: string | null; estructura?: unknown; created_at: string; exercises?: unknown;
};
type Sesion = { id: string; dia: string | null; started_at: string; finished_at: string | null };

/**
 * Si el plan no se ha podido leer entero, todavía puede haber una lista de
 * ejercicios escrita a mano por la coach al subirlo. Es peor que el plan
 * leído —no trae series ni descansos— pero es mejor que nada: ella puede
 * apuntar sus pesos igual.
 */
function diasDeRespaldo(exercises: unknown): DiaEntrenamiento[] {
  const nombres = nombresDe(exercises);
  if (!nombres.length) return [];
  return [{
    nombre: "Tu entreno",
    foco: null,
    ejercicios: nombres.map((nombre) => ({ nombre, series: null, repeticiones: null, descanso: null, nota: null })),
  }];
}

export default async function EntrenoPage() {
  const email = await requireMember();
  const admin = isAdmin(email);
  const e = encodeURIComponent(email);

  const [planes, series, abiertas] = await Promise.all([
    sbSelect<Plan>("plans", `select=id,type,title,file_path,contenido,estructura,created_at,exercises&member_email=eq.${e}&type=eq.entrenamiento&order=created_at.desc&limit=1`)
      // Las columnas de la lectura pueden no existir todavía (falta ejecutar
      // supabase/planes.sql). Sin ellas se sigue, con la lista de respaldo.
      .catch(() => sbSelect<Plan>("plans", `select=id,type,title,file_path,created_at,exercises&member_email=eq.${e}&type=eq.entrenamiento&order=created_at.desc&limit=1`)
        .catch(() => [] as Plan[])),
    // Solo las suyas, y solo lo reciente: para «la última vez» no hace falta
    // el historial entero.
    sbSelect<SerieGuardada & { session_id: string }>(
      "workout_sets",
      `select=session_id,ejercicio,serie,peso,reps,created_at&member_email=eq.${e}&order=created_at.desc&limit=600`
    ).catch(() => [] as (SerieGuardada & { session_id: string })[]),
    sbSelect<Sesion>(
      "workout_sessions",
      `select=id,dia,started_at,finished_at&member_email=eq.${e}&finished_at=is.null&order=started_at.desc&limit=1`
    ).catch(() => [] as Sesion[]),
  ]);

  const plan = planes[0] ?? null;
  const leido = plan ? await leerPlan(plan).catch(() => null) : null;

  let dias: DiaEntrenamiento[] = [];
  if (leido?.estructura && leido.estructura.tipo === "entrenamiento") dias = leido.estructura.dias;
  else if (plan) dias = diasDeRespaldo(plan.exercises);

  // Una sesión abierta de hace más de ocho horas es una que se dejó sin cerrar,
  // no un entreno en marcha: no se le ofrece continuarla.
  const enMarcha = abiertas[0] && Date.now() - new Date(abiertas[0].started_at).getTime() < 8 * 3600_000
    ? abiertas[0] : null;

  const ultima = ultimaVezPorEjercicio(series, enMarcha?.id ?? null);
  // El mapa no cruza el límite servidor→navegador, así que se manda como lista
  // indexada por la misma clave que usa el servidor.
  const ultimaLista: { clave: string; datos: UltimaVez }[] = [];
  for (const d of dias) {
    for (const ej of d.ejercicios) {
      const k = claveEjercicio(ej.nombre);
      const u = ultima.get(k);
      if (u && !ultimaLista.some((x) => x.clave === k)) ultimaLista.push({ clave: k, datos: u });
    }
  }

  // Las series ya apuntadas en el entreno de hoy, para poder retomarlo.
  const deHoy = enMarcha
    ? series.filter((s) => s.session_id === enMarcha.id).map((s) => ({ ejercicio: s.ejercicio, serie: s.serie, peso: s.peso, reps: s.reps }))
    : [];

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <Entreno
            dias={dias}
            planId={plan?.id ?? null}
            planTitulo={plan?.title?.trim() || null}
            sinPlan={!plan}
            ultimaVez={ultimaLista}
            sesionAbierta={enMarcha ? { id: enMarcha.id, dia: enMarcha.dia, desde: enMarcha.started_at } : null}
            seriesDeHoy={deHoy}
          />
        </div>
      </main>
    </>
  );
}
