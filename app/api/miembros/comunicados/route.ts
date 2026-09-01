import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { sbInsert, sbDelete, isMissingTable } from "@/lib/supabase";
import { sendAnnouncementEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";
import { sanearOpciones } from "@/lib/votaciones";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TITLE = 120;
const MAX_BODY = 4000;

/** Solo http(s): evita enlaces con esquemas peligrosos (javascript:, data:…)
 * que luego se renderizan como enlace en el área de las clientas. */
function safeLink(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Publica un comunicado o el diferido de una llamada grupal, y avisa a las
 * clientas. Solo la coach: ellas únicamente leen. */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { title?: unknown; body?: unknown; kind?: unknown; link?: unknown; call_date?: unknown; notify?: unknown; poll_options?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const isCall = data.kind === "llamada";
  const title = typeof data.title === "string" ? data.title.trim().slice(0, MAX_TITLE) : "";
  const body = typeof data.body === "string" ? data.body.trim().slice(0, MAX_BODY) : "";

  let link: string | null = null;
  let callDate: string | null = null;

  if (isCall) {
    link = safeLink(data.link);
    if (!link) return NextResponse.json({ error: "Pega el enlace de la grabación (debe empezar por https://)." }, { status: 400 });
    const d = typeof data.call_date === "string" ? data.call_date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: "Indica la fecha de la llamada." }, { status: 400 });
    callDate = d;
  } else if (!body) {
    return NextResponse.json({ error: "Escribe el comunicado." }, { status: 400 });
  }

  // Votación: solo en comunicados. En el diferido de una llamada no pinta nada,
  // y null es justo lo que significa «comunicado sin votación».
  const pollOptions = isCall ? null : sanearOpciones(data.poll_options);
  if (!isCall && data.poll_options !== undefined && data.poll_options !== null && !pollOptions) {
    return NextResponse.json({ error: "Para votar hacen falta al menos dos opciones distintas." }, { status: 400 });
  }

  // En una llamada el aviso es opcional (puede subirse el diferido sin molestar);
  // en un comunicado siempre se avisa, que es su razón de ser.
  const notify = isCall ? data.notify === true : true;

  const finalTitle = isCall
    ? title || `Llamada grupal del ${new Date(callDate + "T12:00:00Z").toLocaleDateString("es-ES", { day: "2-digit", month: "long", timeZone: "UTC" })}`
    : title || "Nuevo comunicado";

  try {
    await sbInsert("announcements", {
      title: title || null,
      body: body || null,
      kind: isCall ? "llamada" : "comunicado",
      link,
      call_date: callDate,
      poll_options: pollOptions,
      created_by: me,
    });
  } catch (err) {
    console.error("[comunicados] insert", err);
    // Distinguimos "falta la tabla" para poder explicar en pantalla cómo
    // arreglarlo, en vez de dar un error genérico que no dice nada.
    if (isMissingTable(err)) {
      return NextResponse.json(
        { error: "Falta crear la tabla de comunicados en la base de datos.", setup: true },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "No se pudo publicar el comunicado." }, { status: 500 });
  }

  // Avisar a todas las clientas activas. Esperamos a que terminen los envíos
  // para poder decir a cuántas se ha avisado; un fallo suelto (un email que
  // rebota) no tumba la publicación, que ya está guardada.
  let notified = 0;
  const mailBody = isCall
    ? `${body ? body + "\n\n" : ""}Ya tienes disponible la grabación de la llamada grupal:\n${link}`
    : body;
  const pushUrl = isCall ? "/miembros/comunicados?ver=llamadas" : "/miembros/comunicados";
  if (notify) try {
    const members = (await getMembers()).filter((m) => !isAdmin(m.email));
    const preview = mailBody.length > 120 ? mailBody.slice(0, 120) + "…" : mailBody;
    const results = await Promise.allSettled(
      members.map(async (m) => {
        await sendAnnouncementEmail(m.email, { title: finalTitle, body: mailBody });
        sendPushToEmail(m.email, {
          title: `${isCall ? "🎥" : "📣"} ${finalTitle}`,
          body: preview,
          url: pushUrl,
        }).catch((e) => console.error("[comunicados] push", m.email, e));
      })
    );
    notified = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - notified;
    if (failed > 0) console.error(`[comunicados] ${failed} avisos fallaron`);
  } catch (e) {
    console.error("[comunicados] notificar", e);
  }

  return NextResponse.json({ ok: true, notified, notify });
}

/** Borra un comunicado (solo la coach). */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Comunicado no válido." }, { status: 400 });
  }

  try {
    await sbDelete("announcements", `id=eq.${id}`);
  } catch (err) {
    console.error("[comunicados] delete", err);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
