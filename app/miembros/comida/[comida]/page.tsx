import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import MarcarComida from "@/components/MarcarComida";
import { Grupo, NotaCoach } from "@/components/Grupo";
import { requireMember } from "@/lib/guard";
import { isAdmin, adminEmails } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import { leerPlan } from "@/lib/planes";
import { claveComida, comidasDeHoy, momentoDe } from "@/lib/dia";
import { hoyMadrid } from "@/lib/renovaciones";
import { lineaItem } from "@/lib/plan-estructura";

export const metadata: Metadata = { title: "Tu comida", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Plan = { id: string; type: string; title: string | null; note: string | null; file_path: string | null; contenido?: string | null; estructura?: unknown; created_at: string };

export default async function ComidaPage({ params }: { params: { comida: string } }) {
  const email = await requireMember();
  const e = encodeURIComponent(email);
  const hoy = hoyMadrid();
  const clave = claveComida(decodeURIComponent(params.comida));

  const [planes, marcadas, coach] = await Promise.all([
    sbSelect<Plan>("plans", `select=id,type,title,note,file_path,contenido,estructura,created_at&member_email=eq.${e}&type=eq.nutricion&order=created_at.desc&limit=1`)
      .catch(() => [] as Plan[]),
    sbSelect<{ comida: string }>("meal_logs", `select=comida&member_email=eq.${e}&day=eq.${hoy}`).catch(() => [] as { comida: string }[]),
    sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(adminEmails()[0] ?? "")}`)
      .then((r) => r[0]?.display_name ?? null).catch(() => null),
  ]);

  const plan = planes[0] ?? null;
  const leido = plan ? await leerPlan(plan).catch(() => null) : null;
  const estructura = leido?.estructura?.tipo === "nutricion" ? leido.estructura : null;
  const hoyComidas = comidasDeHoy(estructura, hoy);
  const comida = hoyComidas?.comidas.find((c) => claveComida(c.nombre) === clave);
  if (!comida) notFound();

  const hecha = marcadas.some((m) => m.comida === clave);
  const varias = comida.opciones.length > 1;

  return (
    <>
      <AppShell admin={isAdmin(email)} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <Link href="/miembros" className="text-[16px] text-brand">‹ Hoy</Link>
          <h1 className="page-title mt-2 mb-1">{comida.nombre}</h1>
          <p className="text-[15px] text-ink-muted mb-5">
            {[momentoDe(comida), plan?.title?.trim() ? `De tu plan «${plan.title.trim()}»` : "De tu plan"]
              .filter(Boolean).join(" · ")}
          </p>

          <div className="flex flex-col gap-4">
            {comida.opciones.map((op, i) => (
              <div key={i}>
                {varias && (
                  <p className="text-[13px] uppercase tracking-wide text-ink-muted px-4 pb-1.5">
                    {op.etiqueta ?? `Opción ${i + 1}`}
                  </p>
                )}
                <Grupo>
                  {op.items.map((it, j) => (
                    <div key={j} className="flex items-baseline gap-3 px-4 py-3">
                      <span className="flex-1 text-[17px] text-ink">{it.alimento}</span>
                      <span className="text-[17px] font-semibold text-ink whitespace-nowrap">{it.cantidad ?? ""}</span>
                    </div>
                  ))}
                </Grupo>
              </div>
            ))}

            {varias && (
              <p className="text-[13px] text-ink-muted px-1 -mt-1">
                Elige una de las opciones, no las dos.
              </p>
            )}

            {plan?.note?.trim() && <NotaCoach inicial={(coach ?? "C").slice(0, 1)} texto={plan.note.trim()} />}

            <MarcarComida nombre={comida.nombre} hecha={hecha} />

            <Link href="/miembros/fitai" className="bg-brand-soft rounded-[14px] p-4 flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-brand))" strokeWidth="1.7"
                strokeLinecap="round" className="shrink-0" aria-hidden="true">
                <path d="M20.3 12.2c0 4-3.7 7.2-8.3 7.2-1 0-2-.15-2.9-.42L4.2 20.4l1.5-3.7A6.9 6.9 0 0 1 3.7 12.2c0-4 3.7-7.2 8.3-7.2s8.3 3.2 8.3 7.2z" />
                <path d="M8.6 12.1h.01M12 12.1h.01M15.4 12.1h.01" />
              </svg>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-semibold text-ink">Preguntar a FitAI</span>
                <span className="block text-[15px] text-ink-muted">Dudas con una cantidad o con cómo hacerlo</span>
              </span>
            </Link>

            <p className="text-[13px] text-ink-muted px-1">
              El plan lo hace {coach ?? "tu coach"}. Si necesitas cambiar algo, díselo.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
