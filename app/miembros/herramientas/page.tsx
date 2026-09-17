import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Grupo } from "@/components/Grupo";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { HERRAMIENTAS } from "@/lib/herramientas";
import { AVISO_HERRAMIENTAS, HERRAMIENTAS_ACTIVAS } from "@/lib/tools";

export const metadata: Metadata = { title: "Herramientas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function HerramientasPage() {
  // Mismo gate que el resto del área privada: sesión válida, no revocada y sin
  // contratos pendientes de firma.
  const email = await requireMember();
  const admin = isAdmin(email);

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <h1 className="page-title mb-1">Herramientas</h1>
          <p className="text-[15px] text-ink-muted mb-5 max-w-2xl">
            Hazle una foto a lo que tengas delante y te digo qué hacer con ello. Saben cuál es tu
            plan, así que lo que te digan encaja con lo tuyo.
          </p>

          {!HERRAMIENTAS_ACTIVAS ? (
            <div className="bg-surface rounded-[14px] px-4 py-4 flex items-start gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-warn))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3 3-4-4 3-3 6.7-6.7z" />
              </svg>
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-ink leading-snug">Herramientas en mantenimiento</p>
                <p className="text-[15px] text-ink-muted mt-1">{AVISO_HERRAMIENTAS}</p>
              </div>
            </div>
          ) : (
            <>
              <Grupo>
                {HERRAMIENTAS.map((h) => (
                  <Link key={h.id} href={`/miembros/herramientas/${h.id}`}
                    className="flex items-center gap-3.5 px-4 py-3.5 min-h-[62px]">
                    <span aria-hidden="true" className="inline-flex items-center justify-center w-11 h-11 rounded-[12px] bg-page text-[22px] shrink-0">
                      {h.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px] font-semibold text-ink">{h.name}</span>
                      <span className="block text-[15px] text-ink-muted leading-snug">{h.description}</span>
                    </span>
                    <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle shrink-0" aria-hidden="true">
                      <path d="M1.5 1.5L7 7.5l-5.5 6" />
                    </svg>
                  </Link>
                ))}
              </Grupo>
              <p className="text-[13px] text-ink-muted mt-3 px-1">
                Te ayudan con el plan que ya tienes; no lo cambian. Para cambiar algo, díselo a tu coach.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
