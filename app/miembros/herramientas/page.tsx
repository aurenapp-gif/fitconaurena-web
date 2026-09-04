import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ToolLink from "@/components/ToolLink";
import { requireMember } from "@/lib/guard";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = { title: "Herramientas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function HerramientasPage() {
  // Mismo gate que el resto del área privada: sesión válida, no revocada y sin
  // contratos pendientes de firma.
  await requireMember();

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Herramientas</h1>
              <p className="text-sm text-ink-muted mt-2 max-w-2xl">
                Utilidades para ayudarte en el día a día. Úsalas cuando las necesites: están pensadas
                para que sigas avanzando sin renunciar a tu vida.
              </p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {TOOLS.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-ink-muted">Todavía no hay herramientas disponibles. Muy pronto.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {TOOLS.map((t) => (
                <div key={t.id} className="card-dark p-6 !transform-none flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand/10 border border-brand/30 text-xl shrink-0"
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
