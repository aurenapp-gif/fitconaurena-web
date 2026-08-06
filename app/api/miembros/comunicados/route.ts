import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { sbInsert, sbDelete, isMissingTable } from "@/lib/supabase";
import { sendAnnouncementEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TITLE = 120;
const MAX_BODY = 4000;

/** Publica un comunicado y avisa a todas las clientas (email + push).
 * Solo la coach: las clientas únicamente leen. */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { title?: unknown; body?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const title = typeof data.title === "string" ? data.title.trim().slice(0, MAX_TITLE) : "";
  const body = typeof data.body === "string" ? data.body.trim().slice(0, MAX_BODY) : "";
  if (!body) return NextResponse.json({ error: "Escribe el comunicado." }, { status: 400 });

  const finalTitle = title || "Nuevo comunicado";

  try {
    await sbInsert("announcements", { title: title || null, body, created_by: me });
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
  try {
    const members = (await getMembers()).filter((m) => !isAdmin(m.email));
    const preview = body.length > 120 ? body.slice(0, 120) + "…" : body;
    const results = await Promise.allSettled(
      members.map(async (m) => {
        await sendAnnouncementEmail(m.email, { title: finalTitle, body });
        sendPushToEmail(m.email, {
          title: `📣 ${finalTitle}`,
          body: preview,
          url: "/miembros/comunicados",
        }).catch((e) => console.error("[comunicados] push", m.email, e));
      })
    );
    notified = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - notified;
    if (failed > 0) console.error(`[comunicados] ${failed} avisos fallaron`);
  } catch (e) {
    console.error("[comunicados] notificar", e);
  }

  return NextResponse.json({ ok: true, notified });
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
