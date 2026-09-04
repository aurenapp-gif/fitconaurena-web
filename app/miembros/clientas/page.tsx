import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import AddClient from "@/components/AddClient";
import ClientasLista, { type FilaClienta } from "@/components/ClientasLista";
import RenovacionesPendientes, { type FilaRenovacion } from "@/components/RenovacionesPendientes";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { renewalInfo } from "@/lib/profile";
import { sbSelect } from "@/lib/supabase";
import { servicePct } from "@/lib/company";
import { renovacionAlimentacion, renovacionEntrenamiento, hoyMadrid, diaDe, ordenUrgencia } from "@/lib/renovaciones";

export const metadata: Metadata = { title: "Clientas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null; renewal_date: string | null };
type PlanRow = { member_email: string; created_at: string };
type PlanTipo = { member_email: string; type: string; created_at: string };
/** Una fila por clienta, ya sumada por la base de datos. */
type Uso = {
  member_email: string;
  checkins: number;
  ultimo_checkin: string | null;
  planes: number;
  videos: number;
  dias_uso: number;
};

export default async function ClientasPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  // Todo en paralelo. Cada consulta cae por su cuenta para que el listado no se
  // caiga entero si una tabla flaquea.
  //
  // Los totales de uso los calcula la BASE DE DATOS (vista `member_usage`), no
  // esta página. Antes se traía cada fila de check_ins, habit_logs, plans y
  // technique_reviews para contarlas aquí, y Supabase corta toda respuesta en
  // 1.000 filas sin avisar: pasado ese punto los números salían más bajos de lo
  // real y alguna clienta aparecía con un 0 que no le correspondía. Ahora viene
  // una fila por clienta y el techo desaparece.
  const [members, profiles, uso, planDates, templates, planesTipo] = await Promise.all([
    getMembers().then((ms) => ms.filter((m) => !isAdmin(m.email))),
    sbSelect<Prof>("profiles", "select=email,display_name,renewal_date")
      .catch((e) => { console.error("[clientas] profiles", e); return [] as Prof[]; }),
    sbSelect<Uso>("member_usage", "select=*")
      .catch((e) => { console.error("[clientas] member_usage", e); return [] as Uso[]; }),
    // Las fechas de los planes del ciclo en curso sí hacen falta en detalle
    // (el porcentaje de servicio consumido depende de cuándo se entregó cada
    // uno), pero solo las de los últimos dos meses: el cálculo no mira más atrás.
    sbSelect<PlanRow>(
      "plans",
      `select=member_email,created_at&created_at=gte.${new Date(Date.now() - 62 * 86400000).toISOString()}&order=created_at.desc`
    ).catch(() => [] as PlanRow[]),
    sbSelect<{ id: string; title: string; kind: string }>(
      "contract_templates", "select=id,title,kind&active=is.true&order=created_at.asc"
    ).catch(() => [] as { id: string; title: string; kind: string }[]),
    // Para las renovaciones hace falta el ÚLTIMO plan de cada tipo, sin el
    // corte de dos meses de arriba: una alimentación de mayo sin renovar es
    // justo lo que hay que ver. Solo tres columnas, así que sale barato.
    sbSelect<PlanTipo>("plans", "select=member_email,type,created_at&order=created_at.desc")
      .catch((e) => { console.error("[clientas] planes por tipo", e); return [] as PlanTipo[]; }),
  ]);
  const contractTpls = templates.filter((t) => t.kind === "contrato").map((t) => ({ id: t.id, title: t.title }));
  const hasAnexo = templates.some((t) => t.kind === "anexo_salud");

  // `planesTipo` viene de lo más reciente a lo más antiguo, así que la primera
  // vez que aparece una pareja (clienta, tipo) es su último plan de ese tipo.
  const hoy = hoyMadrid();
  const ultimoPlan = new Map<string, string>();
  for (const p of planesTipo) {
    const clave = `${p.member_email}|${p.type}`;
    if (!ultimoPlan.has(clave)) ultimoPlan.set(clave, diaDe(p.created_at));
  }

  const profByEmail = new Map(profiles.map((p) => [p.email, p]));
  const usoByEmail = new Map(uso.map((u) => [u.member_email, u]));
  const planDatesByEmail = new Map<string, string[]>();
  for (const p of planDates) {
    const arr = planDatesByEmail.get(p.member_email) ?? [];
    arr.push(p.created_at); planDatesByEmail.set(p.member_email, arr);
  }

  const rows = members.map((m) => {
    const p = profByEmail.get(m.email);
    const u = usoByEmail.get(m.email);
    return {
      email: m.email,
      name: p?.display_name || m.name,
      renewal: renewalInfo(p?.renewal_date ?? null),
      pct: servicePct(p?.renewal_date, planDatesByEmail.get(m.email) ?? [])?.pct ?? null,
      daysUsed: u?.dias_uso ?? 0,
      checkins: u?.checkins ?? 0,
      plans: u?.planes ?? 0,
      techniques: u?.videos ?? 0,
      lastCheckin: u?.ultimo_checkin ?? null,
    };
  });
  // Ordenadas por urgencia de renovación (las que menos días faltan primero).
  rows.sort((a, b) => {
    const A = a.renewal.days ?? 9999, B = b.renewal.days ?? 9999;
    return A - B;
  });

  // Se aplanan para el componente cliente: solo datos, nada de funciones.
  const filas: FilaClienta[] = rows.map((r) => ({
    email: r.email,
    name: r.name,
    renewalText: r.renewal.text,
    renewalUrgent: r.renewal.urgent,
    pct: r.pct,
    daysUsed: r.daysUsed,
    checkins: r.checkins,
    plans: r.plans,
    techniques: r.techniques,
    lastCheckin: r.lastCheckin,
  }));

  // Solo las que piden acción: vencida, de hoy, o sin plan de ese tipo. Una
  // lista donde sale todo el mundo no se mira.
  const renovaciones: FilaRenovacion[] = members
    .map((m) => {
      const p = profByEmail.get(m.email);
      return {
        email: m.email,
        nombre: p?.display_name || m.name,
        alimentacion: renovacionAlimentacion(ultimoPlan.get(`${m.email}|nutricion`) ?? null, hoy),
        entrenamiento: renovacionEntrenamiento(ultimoPlan.get(`${m.email}|entrenamiento`) ?? null, hoy),
      };
    })
    .filter((f) =>
      ["vencida", "hoy", "sin-plan"].includes(f.alimentacion.urgencia) ||
      ["vencida", "hoy", "sin-plan"].includes(f.entrenamiento.urgencia)
    )
    .sort((a, b) => Math.min(ordenUrgencia(a.alimentacion), ordenUrgencia(a.entrenamiento)) -
                    Math.min(ordenUrgencia(b.alimentacion), ordenUrgencia(b.entrenamiento)));

  return (
    <>
      <AppShell admin />
      <main className="app-main relative min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Clientas</h1>
              <p className="text-sm text-ink-subtle mt-1">{members.length} activa{members.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          <AddClient contracts={contractTpls} hasAnexo={hasAnexo} />

          {members.length > 0 && <RenovacionesPendientes filas={renovaciones} />}

          {members.length === 0 ? (
            <p className="text-ink-muted">Aún no tienes clientas dadas de alta (grupo &quot;Miembros&quot; en MailerLite).</p>
          ) : (
            <ClientasLista filas={filas} />
          )}
        </div>
      </main>
    </>
  );
}
