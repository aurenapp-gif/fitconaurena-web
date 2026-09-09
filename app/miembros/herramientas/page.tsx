import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import ToolLink from "@/components/ToolLink";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { AVISO_HERRAMIENTAS, HERRAMIENTAS_ACTIVAS, TOOLS } from "@/lib/tools";

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
            Utilidades para ayudarte en el día a día. Úsalas cuando las necesites: están pensadas
            para que sigas avanzando sin renunciar a tu vida.
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
          ) : TOOLS.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-ink-muted">Todavía no hay herramientas disponibles. Muy pronto.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {TOOLS.map((t) => (
                <div key={t.id} className="card-dark p-6 !transform-none flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand/10 text-xl shrink-0"
                      aria-hidden="true"
                    >
                      {t.icon}
                    </span>
                    <h2 className="font-bold text-ink text-lg leading-snug pt-1.5">{t.name}</h2>
                  </div>
                  <p className="text-sm text-ink-muted mb-4 flex-1">{t.description}</p>
                  {t.hint && <p className="text-xs text-ink-subtle mb-4">{t.hint}</p>}
                  <ToolLink id={t.id} name={t.name} url={t.url} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
