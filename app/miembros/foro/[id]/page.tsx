import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ForumReply from "@/components/ForumReply";
import QuestionControls from "@/components/QuestionControls";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect } from "@/lib/supabase";
import type { Topic, Question, Reply } from "@/lib/forum";

export const metadata: Metadata = { title: "Pregunta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-fA-F-]{36}$/;

function fmt(d: string) {
  return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function PreguntaPage({ params }: { params: { id: string } }) {
  const email = await requireMember();
  const admin = isAdmin(email);
  if (!UUID.test(params.id)) redirect("/miembros/foro");

  const [qs, replies, topics] = await Promise.all([
    sbSelect<Question>("forum_questions", `select=*&id=eq.${params.id}`).catch(() => [] as Question[]),
    sbSelect<Reply>("forum_replies", `select=*&question_id=eq.${params.id}&order=created_at.asc`).catch(() => [] as Reply[]),
    sbSelect<Topic>("forum_topics", "select=id,name").catch(() => [] as Topic[]),
  ]);
  const question = qs[0];
  if (!question) redirect("/miembros/foro");

  const topicName = question.topic_id ? topics.find((t) => t.id === question.topic_id)?.name : undefined;

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <Link href="/miembros/foro" className="btn-outline text-sm px-5 py-2.5 mb-6 inline-flex">← Preguntas</Link>

          <article className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <h1 className="font-black text-white text-xl md:text-2xl leading-snug">{question.title}</h1>
              <div className="flex items-center gap-1.5 shrink-0">
                {question.pinned && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3]/15 text-[#1CA0E3] border border-[#1CA0E3]/30">📌 Fijada</span>}
                {question.resolved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">✅ Resuelta</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#666666] mb-4">
              {topicName && <span className="px-2 py-0.5 rounded-full border border-[#252525] text-[#A0A0A0]">{topicName}</span>}
              <span>{question.author_name}</span>
              <span>· {fmt(question.created_at)}</span>
            </div>
            {question.body && <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap">{question.body}</p>}
            {admin && (
              <div className="mt-5 pt-4 border-t border-[#252525]">
                <QuestionControls id={question.id} resolved={question.resolved} pinned={question.pinned} />
              </div>
            )}
          </article>

          <h2 className="font-bold text-white mb-3">{replies.length} respuesta{replies.length === 1 ? "" : "s"}</h2>
          <div className="flex flex-col gap-3 mb-6">
            {replies.map((r) => {
              const coach = isAdmin(r.author_email);
              return (
                <div key={r.id} className={`card-dark p-5 !transform-none ${coach ? "border-[#1CA0E3]/40 bg-[#1CA0E3]/5" : ""}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{r.author_name}</span>
                      {coach && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1CA0E3] text-white">COACH</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-[#666666]">{fmt(r.created_at)}</span>
                      {admin && <QuestionControls id={question.id} replyId={r.id} />}
                    </div>
                  </div>
                  <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap">{r.body}</p>
                </div>
              );
            })}
            {replies.length === 0 && <p className="text-sm text-[#A0A0A0]">Aún no hay respuestas. ¡Sé la primera en ayudar!</p>}
          </div>

          <ForumReply questionId={question.id} />
        </div>
      </main>
    </>
  );
}
