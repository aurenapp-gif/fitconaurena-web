import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AnnouncementForm from "@/components/AnnouncementForm";
import AnnouncementDelete from "@/components/AnnouncementDelete";
import SetupSql from "@/components/SetupSql";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, isMissingTable } from "@/lib/supabase";

export const metadata: Metadata = { title: "Comunicados", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Announcement = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
};

// "Nuevo" durante los 3 primeros días, para que se distinga de un vistazo.
const NEW_MS = 3 * 86400000;

const SETUP_SQL = `create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  body       text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);`;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ComunicadosPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  // Si la tabla aún no existe (falta ejecutar supabase/comunicados.sql) la
  // página no rompe: se muestra vacía y, a la coach, con el SQL que falta.
  let items: Announcement[] = [];
  let needsSetup = false;
  try {
    items = await sbSelect<Announcement>(
      "announcements",
      "select=id,title,body,created_at&order=created_at.desc&limit=100"
    );
  } catch (e) {
    console.error("[comunicados]", e);
    needsSetup = isMissingTable(e);
  }

  const now = Date.now();

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Tablón</span>
              <h1 className="section-title">Comunicados</h1>
              <p className="text-sm text-[#666666] mt-1">
                {admin
                  ? "Lo que publiques aquí les llega por email y notificación al instante."
                  : "Avisos importantes de tu coach. Aquí los tienes todos siempre a mano."}
              </p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {admin && needsSetup && (
            <div className="mb-6">
              <SetupSql title="Falta un paso para poder publicar" sql={SETUP_SQL} />
            </div>
          )}

          {admin && (
            <div className="card-dark p-6 !transform-none mb-6 border-[#1CA0E3]/30">
              <h2 className="font-bold text-white mb-4">Nuevo comunicado</h2>
              <AnnouncementForm />
            </div>
          )}

          {items.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-[#A0A0A0]">
                {admin
                  ? "Aún no has publicado ningún comunicado. El primero que escribas les llegará al correo y al móvil."
                  : "Todavía no hay comunicados. Cuando tu coach publique alguno, te avisaremos y aparecerá aquí."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((a) => {
                const isNew = now - new Date(a.created_at).getTime() < NEW_MS;
                return (
                  <article key={a.id} className="card-dark p-5 !transform-none">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isNew && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">Nuevo</span>
                          )}
                          <span className="text-xs text-[#666666]">{fmt(a.created_at)}</span>
                        </div>
                        {a.title && <h2 className="font-bold text-white">{a.title}</h2>}
                      </div>
                      {admin && <AnnouncementDelete id={a.id} />}
                    </div>
                    <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{a.body}</p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
