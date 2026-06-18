import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import NewQuestion from "@/components/NewQuestion";
import ForumTopicManager from "@/components/ForumTopicManager";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect } from "@/lib/supabase";
import type { Topic, Question } from "@/lib/forum";

export const metadata: Metadata = { title: "Preguntas y respuestas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

export default async function ForoPage({ searchParams }: { searchParams: { q?: string; topic?: string } }) {
  const email = await requireMember();
  const admin = isAdmin(email);

  const q = (searchParams.q ?? "").slice(0, 100);
  const term = q.replace(/[(),*]/g, " ").trim();
  const topicId = Number(searchParams.topic);
  const hasTopic = Number.isInteger(topicId) && topicId > 0;

  let query = "select=*&order=pinned.desc,last_activity.desc&limit=100";
  if (hasTopic) query += `&topic_id=eq.${topicId}`;
  if (term) query += `&or=(title.ilike.*${encodeURIComponent(term)}*,body.ilike.*${encodeURIComponent(term)}*)`;

  const [topics, questions] = await Promise.all([
    sbSelect<Topic>("forum_topics", "select=id,name,position&order=position.asc,name.asc").catch(() => [] as Topic[]),
    sbSelect<Question>("forum_questions", query).catch(() => [] as Question[]),
  ]);

  // Nº de respuestas por pregunta.
  const counts = new Map<string, number>();
  const ids = questions.map((x) => x.id);
  if (ids.length) {
    const reps = await sbSelect<{ question_id: string }>(
      "forum_replies", `select=question_id&question_id=in.(${ids.join(",")})`
    ).catch(() => []);
    for (const r of reps) counts.set(r.question_id, (counts.get(r.question_id) ?? 0) + 1);
  }
  const topicName = new Map(topics.map((t) => [t.id, t.name]));
  const link = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    return `/miembros/foro${sp.toString() ? `?${sp}` : ""}`;
  };

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
            <div>
              <span className="section-tag">Comunidad</span>
              <h1 className="section-title">Preguntas y respuestas</h1>
            </div>
            <Link href="/miembros/comunidad" className="btn-outline text-sm px-5 py-2.5">← Comunidad</Link>
          </div>
          <p className="text-sm text-[#666666] mb-6">Busca tu duda: quizá ya está respondida. Y si no, pregunta y te ayudamos.</p>

          {/* Buscador */}
          <form action="/miembros/foro" method="get" className="flex gap-2 mb-4">
            {hasTopic && <input type="hidden" name="topic" value={String(topicId)} />}
            <input
              name="q" defaultValue={q} placeholder="Buscar una pregunta (ej. saciedad, cardio, cheat meal)…"
              aria-label="Buscar" className="flex-1 rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]"
            />
            <button type="submit" className="btn-brand text-sm px-5 py-3">Buscar</button>
          </form>

          {/* Filtro por temática */}
          <div className="flex gap-2 flex-wrap mb-6">
            <Link href={link(q ? { q } : {})} className={`text-xs font-bold px-3 py-1.5 rounded-full ${!hasTopic ? "bg-[#1CA0E3] text-white" : "border border-[#252525] text-[#A0A0A0] hover:text-white"}`}>Todas</Link>
            {topics.map((t) => (
              <Link key={t.id} href={link({ ...(q ? { q } : {}), topic: String(t.id) })}
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${hasTopic && topicId === t.id ? "bg-[#1CA0E3] text-white" : "border border-[#252525] text-[#A0A0A0] hover:text-white"}`}>
                {t.name}
              </Link>
            ))}
          </div>

          {admin && <ForumTopicManager topics={topics} />}

          <NewQuestion topics={topics} defaultTopic={hasTopic ? topicId : null} />

          {/* Lista de preguntas */}
          <div className="flex flex-col gap-3 mt-6">
            {questions.length === 0 ? (
              <p className="text-[#A0A0A0]">{term || hasTopic ? "No hay preguntas que coincidan. ¡Haz la tuya!" : "Aún no hay preguntas. ¡Sé la primera en preguntar!"}</p>
            ) : (
              questions.map((qq) => (
                <Link key={qq.id} href={`/miembros/foro/${qq.id}`} className="card-dark p-5 !transform-none hover:border-[#1CA0E3]/40 block">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-white">{qq.title}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {qq.pinned && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3]/15 text-[#1CA0E3] border border-[#1CA0E3]/30">📌 Fijada</span>}
                      {qq.resolved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">✅ Resuelta</span>}
                    </div>
                  </div>
                  {qq.body && <p className="text-sm text-[#A0A0A0] mt-1 line-clamp-2">{qq.body}</p>}
                  <div className="flex items-center gap-2 flex-wrap mt-3 text-[11px] text-[#666666]">
                    {qq.topic_id && topicName.has(qq.topic_id) && (
                      <span className="px-2 py-0.5 rounded-full border border-[#252525] text-[#A0A0A0]">{topicName.get(qq.topic_id)}</span>
                    )}
                    <span>{qq.author_name}</span>
                    <span>· {fmt(qq.created_at)}</span>
                    <span>· {counts.get(qq.id) ?? 0} respuesta{(counts.get(qq.id) ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
