import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbInsert } from "@/lib/supabase";
import { displayName, type Question } from "@/lib/forum";

export const runtime = "nodejs";

// Lista de preguntas, con filtro por temática (?topic=) y buscador (?q=).
export async function GET(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const topic = Number(req.nextUrl.searchParams.get("topic"));
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  // Quitamos caracteres que rompen la sintaxis de PostgREST en el filtro `or`.
  const term = q.replace(/[(),*]/g, " ").trim();

  let query = "select=*&order=pinned.desc,last_activity.desc&limit=100";
  if (Number.isInteger(topic) && topic > 0) query += `&topic_id=eq.${topic}`;
  if (term) query += `&or=(title.ilike.*${encodeURIComponent(term)}*,body.ilike.*${encodeURIComponent(term)}*)`;

  try {
    const questions = await sbSelect<Question>("forum_questions", query);
    // Nº de respuestas por pregunta visible.
    const counts = new Map<string, number>();
    const ids = questions.map((x) => x.id);
    if (ids.length) {
      const reps = await sbSelect<{ question_id: string }>(
        "forum_replies",
        `select=question_id&question_id=in.(${ids.join(",")})`
      ).catch(() => []);
      for (const r of reps) counts.set(r.question_id, (counts.get(r.question_id) ?? 0) + 1);
    }
    const withCounts = questions.map((x) => ({ ...x, replies: counts.get(x.id) ?? 0 }));
    return NextResponse.json({ ok: true, questions: withCounts });
  } catch (e) {
    console.error("[foro GET]", e);
    return NextResponse.json({ ok: true, questions: [] });
  }
}

// Crear una pregunta.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { title?: unknown; body?: unknown; topic_id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (title.length < 5) return NextResponse.json({ error: "Escribe una pregunta más concreta." }, { status: 400 });
  const topic_id = Number(body.topic_id);

  let name = displayName(null, email);
  try {
    const prof = await sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(email)}`);
    name = displayName(prof[0]?.display_name, email);
  } catch { /* fallback */ }

  try {
    const row = await sbInsert<{ id: string }>("forum_questions", {
      topic_id: Number.isInteger(topic_id) && topic_id > 0 ? topic_id : null,
      author_email: email,
      author_name: name,
      title,
      body: text || null,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("[foro POST]", e);
    return NextResponse.json({ error: "No se pudo publicar la pregunta." }, { status: 500 });
  }
}
