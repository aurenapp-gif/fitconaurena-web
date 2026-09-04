import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import SetupSql from "@/components/SetupSql";
import DudaForm from "@/components/DudaForm";
import DudaLike from "@/components/DudaLike";
import DudaAnswer from "@/components/DudaAnswer";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, isMissingTable } from "@/lib/supabase";
import { CATEGORIES, categoryOf, statusOf, type Duda, type DudaStatus } from "@/lib/dudas";
import { voterHash } from "@/lib/dudasVoto";

export const metadata: Metadata = { title: "Dudas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SETUP_SQL = `create table if not exists public.dudas (
  id          uuid primary key default gen_random_uuid(),
  categoria   text not null default 'otras',
  body        text not null,
  answer      text,
  answer_url  text,
  answered_at timestamptz,
  status      text not null default 'nueva',
  hidden      boolean not null default false,
  reply_email text,
  created_at  date not null default current_date
);

create index if not exists dudas_created_at_idx on public.dudas (created_at desc);
create index if not exists dudas_status_idx     on public.dudas (status);

create table if not exists public.duda_likes (
  duda_id    uuid not null references public.dudas(id) on delete cascade,
  voter_hash text not null,
  created_at date not null default current_date,
  primary key (duda_id, voter_hash)
);

create index if not exists duda_likes_duda_idx on public.duda_likes (duda_id);

alter table public.dudas      enable row level security;
alter table public.duda_likes enable row level security;`;

function fmtDay(d: string) {
  // La fecha es un día suelto: se fija a mediodía UTC para que no se desplace
  // al día anterior según la zona horaria de quien lo mire.
  return new Date(d + "T12:00:00Z").toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export default async function DudasPage({ searchParams }: { searchParams: { tema?: string } }) {
  const email = await requireMember();
  const admin = isAdmin(email);
  const tema = CATEGORIES.some((c) => c.id === searchParams.tema) ? searchParams.tema : undefined;

  let all: Duda[] = [];
  let likeRows: { duda_id: string; voter_hash: string }[] = [];
  let needsSetup = false;
  try {
    // La coach necesita el correo de las consultas privadas (son las únicas que
    // lo tienen); a las clientas no se les llega a pedir esa columna.
    const cols = `id,categoria,body,answer,answer_url,answered_at,status,hidden,created_at${admin ? ",reply_email" : ""}`;
    // Y a ellas se les descartan aquí, en la propia consulta, las privadas y
    // las ocultas: filtrarlas después no valdría, porque sin pedir la columna
    // `reply_email` no habría con qué distinguir una consulta privada.
    const filtro = admin ? "" : "&reply_email=is.null&hidden=is.false";
    [all, likeRows] = await Promise.all([
      sbSelect<Duda>("dudas", `select=${cols}${filtro}&order=created_at.desc&limit=300`),
      sbSelect<{ duda_id: string; voter_hash: string }>("duda_likes", "select=duda_id,voter_hash&limit=5000"),
    ]);
  } catch (e) {
    console.error("[dudas]", e);
    needsSetup = isMissingTable(e);
  }

  // Recuento de "a mí también" y si esta persona ya lo marcó. El hash se
  // calcula aquí y no se guarda en ningún sitio ligado a la sesión.
  const mineHash = voterHash(email);
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const r of likeRows) {
    counts.set(r.duda_id, (counts.get(r.duda_id) ?? 0) + 1);
    if (r.voter_hash === mineHash) mine.add(r.duda_id);
  }

  // A las clientas ya les llegan filtradas de la consulta; este segundo filtro
  // es el cinturón por si algún día alguien toca la consulta de arriba.
  const visible = admin ? all : all.filter((d) => !d.hidden && !d.reply_email);
  const list = (tema ? visible.filter((d) => d.categoria === tema) : visible)
    // Arriba lo que más gente ha marcado: es lo que más urge responder.
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at));

  const sinResponder = visible.filter((d) => d.status === "nueva").length;

  const tabCls = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
      active ? "bg-brand text-white" : "border border-line text-ink-muted hover:text-ink"
    }`;

  return (
    <>
      <AppShell admin={admin} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Dudas</h1>
              <p className="text-sm text-ink-muted mt-2 max-w-2xl">
                {admin
                  ? `Lo que tus clientas no se atreven a preguntar en la llamada. Nadie sabe quién ha escrito cada duda, tú tampoco.${sinResponder > 0 ? ` Tienes ${sinResponder} sin responder.` : ""}`
                  : "Aquí puedes preguntar sin dar la cara. Nadie sabrá que has sido tú, tu coach tampoco. Si a ti te pasa, seguramente le pase a más gente."}
              </p>
            </div>
          </div>

          {admin && needsSetup && (
            <div className="mb-6">
              <SetupSql title="Falta un paso para activar el buzón de dudas" sql={SETUP_SQL} />
            </div>
          )}

          {!admin && (
            <div className="card-dark p-6 !transform-none mb-6 border-brand/30">
              <h2 className="font-bold text-ink mb-1">Deja tu duda</h2>
              <p className="text-sm text-ink-subtle mb-4">
                No se guarda tu nombre ni tu correo, solo el día. Ni siquiera tu coach puede saber
                quién la ha escrito.
              </p>
              <DudaForm />
            </div>
          )}

          {/* Filtro por tema */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Link href="/miembros/dudas" className={tabCls(!tema)}>Todas{visible.length > 0 ? ` (${visible.length})` : ""}</Link>
            {CATEGORIES.map((c) => {
              const n = visible.filter((d) => d.categoria === c.id).length;
              if (n === 0) return null;
              return (
                <Link key={c.id} href={`/miembros/dudas?tema=${c.id}`} className={tabCls(tema === c.id)}>
                  <span aria-hidden="true">{c.icon}</span> {c.label} ({n})
                </Link>
              );
            })}
          </div>

          {list.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-ink-muted">
                {admin
                  ? "Todavía no hay ninguna duda. Cuéntaselo en la próxima llamada: cuando entiendan que es de verdad anónimo, empiezan a escribir."
                  : tema
                    ? "No hay dudas de este tema todavía. Puedes ser la primera."
                    : "Todavía no hay ninguna duda publicada. Anímate: la tuya puede ayudar a alguien más."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {list.map((d) => {
                const cat = categoryOf(d.categoria);
                const st = statusOf(d.status);
                const answered = !!(d.answer || d.answer_url);
                return (
                  <article key={d.id} className="card-dark p-5 !transform-none">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-bold text-ink-muted">
                        <span aria-hidden="true">{cat.icon}</span> {cat.label}
                      </span>
                      <span className="text-xs text-ink-subtle">· {fmtDay(d.created_at)}</span>
                      {(answered || d.status !== "nueva") && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${st.color}22`, color: st.color }}
                        >
                          {st.label}
                        </span>
                      )}
                      {admin && d.reply_email && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warn/15 text-warn">
                          🔒 Privada · {d.reply_email}
                        </span>
                      )}
                      {admin && d.hidden && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/15 text-danger">
                          Oculta
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-ink whitespace-pre-wrap mb-3">{d.body}</p>

                    {answered && (
                      <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 mb-3">
                        <p className="text-xs font-bold text-brand mb-1.5">Respuesta de tu coach</p>
                        {d.answer && <p className="text-sm text-ink-muted whitespace-pre-wrap">{d.answer}</p>}
                        {d.answer_url && (
                          <a
                            href={d.answer_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-brand text-xs px-5 py-2.5 mt-3 inline-flex"
                          >
                            ▶ Verlo explicado
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* En una consulta privada no hay a quién sumarse. Y la
                          coach no vota: su voto falsearía la señal que usa
                          precisamente para decidir qué responder antes. */}
                      {!d.reply_email && (
                        admin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink-muted">
                            <span aria-hidden="true">💙</span>
                            {(counts.get(d.id) ?? 0) === 0
                              ? "Nadie se ha sumado"
                              : `${counts.get(d.id)} ${counts.get(d.id) === 1 ? "persona" : "personas"} más`}
                          </span>
                        ) : (
                          <DudaLike id={d.id} likes={counts.get(d.id) ?? 0} mine={mine.has(d.id)} />
                        )
                      )}
                      {admin && (
                        <DudaAnswer
                          id={d.id}
                          answer={d.answer}
                          answerUrl={d.answer_url}
                          status={d.status as DudaStatus}
                          hidden={d.hidden}
                        />
                      )}
                    </div>
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
