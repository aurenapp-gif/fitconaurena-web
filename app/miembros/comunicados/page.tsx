import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import AnnouncementForm from "@/components/AnnouncementForm";
import AnnouncementDelete from "@/components/AnnouncementDelete";
import AnnouncementPoll from "@/components/AnnouncementPoll";
import GroupCallForm from "@/components/GroupCallForm";
import SetupSql from "@/components/SetupSql";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, isMissingTable } from "@/lib/supabase";
import { recuento, miVoto } from "@/lib/votaciones";

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
  poll_options?: string[] | null;
  poll_closed_at?: string | null;
};
type VotoFila = { announcement_id: string; member_email: string; option_index: number };

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
  on public.announcements (created_at desc);

alter table public.announcements add column if not exists poll_options   jsonb;
alter table public.announcements add column if not exists poll_closed_at timestamptz;

create table if not exists public.announcement_votes (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_email    text not null,
  option_index    smallint not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (announcement_id, member_email)
);

create index if not exists announcement_votes_ann_idx
  on public.announcement_votes (announcement_id);

alter table public.announcement_votes enable row level security;`;

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
      "select=id,title,body,created_at,kind,link,call_date,poll_options,poll_closed_at&order=created_at.desc&limit=100"
    );
  } catch (e) {
    console.error("[comunicados]", e);
    needsSetup = isMissingTable(e);
    // Puede fallar solo por las columnas nuevas de la votación: se reintenta
    // sin ellas para que el tablón no desaparezca mientras falte esa migración.
    if (!needsSetup) {
      items = await sbSelect<Announcement>(
        "announcements",
        "select=id,title,body,created_at,kind,link,call_date&order=created_at.desc&limit=100"
      ).catch(() => [] as Announcement[]);
    }
  }

  // Votos de los comunicados con votación. Si la tabla aún no existe se sigue
  // viendo el tablón entero, solo que sin recuentos.
  const conVotacion = items.filter((a) => Array.isArray(a.poll_options) && a.poll_options.length > 0);
  let votos: VotoFila[] = [];
  if (conVotacion.length > 0) {
    votos = await sbSelect<VotoFila>(
      "announcement_votes",
      `select=announcement_id,member_email,option_index&announcement_id=in.(${conVotacion.map((a) => a.id).join(",")})`
    ).catch((e) => { console.error("[comunicados] votos", e); return [] as VotoFila[]; });
  }

  // Nombres para que la coach vea quién votó qué, no una lista de correos.
  const nombres = new Map<string, string>();
  let activas: string[] = [];
  if (admin && conVotacion.length > 0) {
    const profs = await sbSelect<{ email: string; display_name: string | null; access_revoked: boolean | null }>(
      "profiles", "select=email,display_name,access_revoked"
    ).catch(() => [] as { email: string; display_name: string | null; access_revoked: boolean | null }[]);
    for (const p of profs) {
      if (isAdmin(p.email)) continue;
      nombres.set(p.email, p.display_name || p.email);
      if (!p.access_revoked) activas.push(p.email);
    }
  }

  // Las entradas antiguas no tienen `kind`: cuentan como comunicado.
  const calls = items.filter((a) => a.kind === "llamada");
  const posts = items.filter((a) => a.kind !== "llamada");
  const list = tab === "llamadas" ? calls : posts;
  const now = Date.now();

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
      active ? "bg-brand text-white" : "border border-line text-ink-muted hover:text-ink"
    }`;

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Tablón</span>
              <h1 className="section-title">Comunicados</h1>
              <p className="text-sm text-ink-subtle mt-1">
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
            <div className="card-dark p-6 !transform-none mb-6 border-brand/30">
              <h2 className="font-bold text-ink mb-4">
                {tab === "llamadas" ? "Subir grabación de la llamada" : "Nuevo comunicado"}
              </h2>
              {tab === "llamadas" ? <GroupCallForm /> : <AnnouncementForm />}
            </div>
          )}

          {list.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-ink-muted">
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
                const opciones = Array.isArray(a.poll_options) ? a.poll_options : null;
                const susVotos = opciones ? votos.filter((v) => v.announcement_id === a.id) : [];
                const bruto = opciones ? recuento(opciones, susVotos, (e) => nombres.get(e) ?? e) : null;
                // QUIÉN votó qué se le quita a todo el que no sea la coach ANTES
                // de mandarlo al navegador. No basta con no pintarlo: lo que se
                // le pasa a un componente cliente viaja en el código de la
                // página, y ahí lo lee cualquiera. Sin esto, cada clienta
                // recibía los correos de las demás y su voto.
                const r = bruto && {
                  ...bruto,
                  filas: bruto.filas.map((f) => (admin ? f : { ...f, quienes: [] })),
                };
                const yaVotaron = new Set(susVotos.map((v) => v.member_email));
                return (
                  <article key={a.id} className="card-dark p-5 !transform-none">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isNew && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand text-white">Nuevo</span>
                          )}
                          <span className="text-xs text-ink-subtle">
                            {isCall && a.call_date ? fmtDay(a.call_date) : fmt(a.created_at)}
                          </span>
                        </div>
                        {a.title && <h2 className="font-bold text-ink">{a.title}</h2>}
                      </div>
                      {admin && <AnnouncementDelete id={a.id} />}
                    </div>
                    {a.body && <p className="text-sm text-ink-muted whitespace-pre-wrap">{a.body}</p>}
                    {isCall && a.link && (
                      <a href={a.link} target="_blank" rel="noopener noreferrer"
                        className="btn-brand text-sm px-5 py-2.5 mt-3 inline-flex">
                        ▶ Ver la grabación
                      </a>
                    )}
                    {opciones && r && (
                      <AnnouncementPoll
                        id={a.id}
                        filas={r.filas}
                        total={r.total}
                        miVoto={miVoto(susVotos, email)}
                        cerrada={!!a.poll_closed_at}
                        admin={admin}
                        sinVotar={admin ? activas.filter((e) => !yaVotaron.has(e)).map((e) => nombres.get(e) ?? e).sort((x, y) => x.localeCompare(y, "es")) : []}
                      />
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
