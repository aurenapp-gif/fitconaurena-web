import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AnnouncementForm from "@/components/AnnouncementForm";
import AnnouncementDelete from "@/components/AnnouncementDelete";
import GroupCallForm from "@/components/GroupCallForm";
import SetupSql from "@/components/SetupSql";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, isMissingTable } from "@/lib/supabase";

export const metadata: Metadata = { title: "Comunicados", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Announcement = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string;
  kind?: string | null;
  link?: string | null;
  call_date?: string | null;
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

alter table public.announcements add column if not exists kind      text not null default 'comunicado';
alter table public.announcements add column if not exists link      text;
alter table public.announcements add column if not exists call_date date;
alter table public.announcements alter column body drop not null;

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);`;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}
// La fecha de la llamada es un día suelto (sin hora): se fija a mediodía UTC
// para que no se desplace al día anterior según la zona horaria.
function fmtDay(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("es-ES", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export default async function ComunicadosPage({ searchParams }: { searchParams: { ver?: string } }) {
  const email = await requireMember();
  const admin = isAdmin(email);
  const tab = searchParams.ver === "llamadas" ? "llamadas" : "comunicados";

  // Si la tabla aún no existe (falta ejecutar supabase/comunicados.sql) la
  // página no rompe: se muestra vacía y, a la coach, con el SQL que falta.
  let items: Announcement[] = [];
  let needsSetup = false;
  try {
    items = await sbSelect<Announcement>(
      "announcements",
      "select=id,title,body,created_at,kind,link,call_date&order=created_at.desc&limit=100"
    );
  } catch (e) {
    console.error("[comunicados]", e);
    needsSetup = isMissingTable(e);
  }

  // Las entradas antiguas no tienen `kind`: cuentan como comunicado.
  const calls = items.filter((a) => a.kind === "llamada");
  const posts = items.filter((a) => a.kind !== "llamada");
  const list = tab === "llamadas" ? calls : posts;
  const now = Date.now();

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
      active ? "bg-[#1CA0E3] text-white" : "border border-[#252525] text-[#A0A0A0] hover:text-white"
    }`;

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
                {tab === "llamadas"
                  ? admin
                    ? "Sube aquí la grabación de la llamada de cada semana."
                    : "¿No pudiste asistir? Aquí tienes las grabaciones de las llamadas grupales."
                  : admin
                    ? "Lo que publiques aquí les llega por email y notificación al instante."
                    : "Avisos importantes de tu coach. Aquí los tienes todos siempre a mano."}
              </p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {/* Sub-apartados */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Link href="/miembros/comunicados" className={tabCls(tab === "comunicados")}>
              📣 Comunicados{posts.length > 0 ? ` (${posts.length})` : ""}
            </Link>
            <Link href="/miembros/comunicados?ver=llamadas" className={tabCls(tab === "llamadas")}>
              🎥 Llamadas grupales{calls.length > 0 ? ` (${calls.length})` : ""}
            </Link>
          </div>

          {admin && needsSetup && (
            <div className="mb-6">
              <SetupSql title="Falta un paso para poder publicar" sql={SETUP_SQL} />
            </div>
          )}

          {admin && (
            <div className="card-dark p-6 !transform-none mb-6 border-[#1CA0E3]/30">
              <h2 className="font-bold text-white mb-4">
                {tab === "llamadas" ? "Subir grabación de la llamada" : "Nuevo comunicado"}
              </h2>
              {tab === "llamadas" ? <GroupCallForm /> : <AnnouncementForm />}
            </div>
          )}

          {list.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-[#A0A0A0]">
                {tab === "llamadas"
                  ? admin
                    ? "Aún no has subido ninguna grabación. Sube la de esta semana con su fecha y quedará aquí para quien no pudiera asistir."
                    : "Todavía no hay grabaciones. Cuando tu coach suba la de esta semana, aparecerá aquí."
                  : admin
                    ? "Aún no has publicado ningún comunicado. El primero que escribas les llegará al correo y al móvil."
                    : "Todavía no hay comunicados. Cuando tu coach publique alguno, te avisaremos y aparecerá aquí."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {list.map((a) => {
                const isNew = now - new Date(a.created_at).getTime() < NEW_MS;
                const isCall = a.kind === "llamada";
                return (
                  <article key={a.id} className="card-dark p-5 !transform-none">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isNew && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">Nuevo</span>
                          )}
                          <span className="text-xs text-[#666666]">
                            {isCall && a.call_date ? fmtDay(a.call_date) : fmt(a.created_at)}
                          </span>
                        </div>
                        {a.title && <h2 className="font-bold text-white">{a.title}</h2>}
                      </div>
                      {admin && <AnnouncementDelete id={a.id} />}
                    </div>
                    {a.body && <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{a.body}</p>}
                    {isCall && a.link && (
                      <a href={a.link} target="_blank" rel="noopener noreferrer"
                        className="btn-brand text-sm px-5 py-2.5 mt-3 inline-flex">
                        ▶ Ver la grabación
                      </a>
                    )}
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
