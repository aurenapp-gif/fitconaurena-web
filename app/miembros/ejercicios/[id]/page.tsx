import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { ejercicioPorId } from "@/lib/catalogo";
import { NOMBRE_MATERIAL, NOMBRE_MOTIVO, NOMBRE_NIVEL, NOMBRE_PATRON, loQueFalta } from "@/lib/ejercicios";
import { NOMBRE_GRUPO } from "@/lib/musculos";

export const metadata: Metadata = { title: "Ejercicio", robots: { index: false, follow: false } };
// Dinámica: la ficha es igual para todas, pero quién puede verla NO. Si se
// prerenderizara, la comprobación de sesión se quedaría congelada en el build.
export const dynamic = "force-dynamic";

/** La ficha de un ejercicio: lo que verá la clienta dentro de su plan. */
export default async function EjercicioPage({ params }: { params: { id: string } }) {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!(await puedeGestionarClientas(me))) redirect("/miembros");

  const e = ejercicioPorId(params.id);
  if (!e) notFound();

  const falta = loQueFalta(e);

  const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <section className="mb-5">
      <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">{titulo}</h2>
      {children}
    </section>
  );

  return (
    <>
      <AppShell admin ceo={isAdmin(me)} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <Link href="/miembros/ejercicios" className="text-sm text-brand">← Ejercicios</Link>

          <h1 className="page-title mt-3 mb-2">{e.nombre}</h1>
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-[12px] font-semibold uppercase tracking-wide bg-brand-soft text-brand-dark rounded-lg px-2.5 py-1">
              {NOMBRE_GRUPO[e.grupo]}
            </span>
            {e.secundarios.map((g) => (
              <span key={g} className="text-[12px] font-semibold uppercase tracking-wide bg-surface-2 text-ink-muted rounded-lg px-2.5 py-1">
                {NOMBRE_GRUPO[g]}
              </span>
            ))}
            <span className="text-[12px] font-semibold uppercase tracking-wide bg-surface-2 text-ink-muted rounded-lg px-2.5 py-1">
              {NOMBRE_MATERIAL[e.material]}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-wide bg-surface-2 text-ink-muted rounded-lg px-2.5 py-1">
              {NOMBRE_PATRON[e.patron]}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-wide bg-surface-2 text-ink-muted rounded-lg px-2.5 py-1">
              {NOMBRE_NIVEL[e.nivel]}
            </span>
          </div>

          {falta.length > 0 && (
            <p className="rounded-[14px] bg-warn-soft text-warn px-4 py-3 mb-5 text-[15px]">
              A esta ficha le falta: {falta.join(", ")}.
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-x-7">
            <div>
              <Bloque titulo="Cómo se hace">
                <ol className="bg-surface rounded-xl p-4 space-y-2 list-decimal list-inside">
                  {e.pasos.map((p, i) => (
                    <li key={i} className="text-[15px] text-ink leading-relaxed">{p}</li>
                  ))}
                </ol>
              </Bloque>

              {e.ajuste.length > 0 && (
                <Bloque titulo="Cómo dejar la máquina">
                  <ul className="bg-brand-soft rounded-xl p-4 space-y-1.5">
                    {e.ajuste.map((a, i) => (
                      <li key={i} className="text-[15px] text-brand-dark leading-relaxed">{a}</li>
                    ))}
                  </ul>
                </Bloque>
              )}

              <Bloque titulo="Errores típicos">
                <ul className="bg-warn-soft rounded-xl p-4 space-y-1.5">
                  {e.errores.map((x, i) => (
                    <li key={i} className="text-[15px] text-warn leading-relaxed">{x}</li>
                  ))}
                </ul>
              </Bloque>
            </div>

            <div>
              <Bloque titulo="Cómo saber que va bien">
                <p className="bg-surface rounded-xl p-4 text-[15px] text-ink-muted leading-relaxed">{e.senales}</p>
              </Bloque>

              {e.cuidado && (
                <Bloque titulo="Cuidado si…">
                  <p className="bg-surface rounded-xl p-4 text-[15px] text-ink-muted leading-relaxed">{e.cuidado}</p>
                </Bloque>
              )}

              <Bloque titulo="Por cuál cambiarlo">
                <div className="bg-surface rounded-xl divide-y divide-line">
                  {e.sustitutos.map((s) => {
                    const otro = ejercicioPorId(s.id);
                    if (!otro) return null;
                    return (
                      <Link key={s.id} href={`/miembros/ejercicios/${otro.id}`}
                        className="flex items-center gap-3 px-4 py-3 min-h-[48px]">
                        <span className="text-[15px] text-ink flex-1 min-w-0">{otro.nombre}</span>
                        <span className="text-[13px] text-ink-subtle shrink-0">{NOMBRE_MOTIVO[s.motivo]}</span>
                      </Link>
                    );
                  })}
                </div>
              </Bloque>

              <Bloque titulo="Vídeo e imagen">
                <p className="bg-surface rounded-xl p-4 text-[15px] text-ink-muted leading-relaxed">
                  Todavía no. Las imágenes de arranque y, después, tus vídeos entran en el siguiente paso.
                </p>
              </Bloque>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
