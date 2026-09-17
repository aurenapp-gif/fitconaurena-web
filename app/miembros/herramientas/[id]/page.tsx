import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import Herramienta from "@/components/Herramienta";
import { requireMember } from "@/lib/guard";
import { isAdmin } from "@/lib/members";
import { buscaHerramienta } from "@/lib/herramientas";
import { HERRAMIENTAS_ACTIVAS } from "@/lib/tools";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const h = buscaHerramienta(params.id);
  return { title: h ? h.name : "Herramienta", robots: { index: false, follow: false } };
}

export default async function HerramientaPage({ params }: { params: { id: string } }) {
  const email = await requireMember();
  const def = buscaHerramienta(params.id);
  if (!def || !HERRAMIENTAS_ACTIVAS) notFound();

  return (
    <>
      <AppShell admin={isAdmin(email)} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <Herramienta def={def} />
        </div>
      </main>
    </>
  );
}
