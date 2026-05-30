import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbInsert } from "@/lib/supabase";
import { sendNewMessageNotice } from "@/lib/mailer";
import { sendPushToEmail, sendPushToEmails } from "@/lib/push";

export const runtime = "nodejs";

type Msg = {
  id: string;
  member_email: string;
  sender: "member" | "coach";
  body: string;
  created_at: string;
};

/** Canal de la conversación según rol. Devuelve null si no autorizado. */
function channelFor(email: string, memberParam: string | null): string | null {
  if (isAdmin(email)) {
    const m = memberParam ? normalizeEmail(memberParam) : "";
    return isValidEmail(m) ? m : null;
  }
  return email; // un miembro solo ve/escribe en su propio canal
}

export async function GET(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const channel = channelFor(email, req.nextUrl.searchParams.get("member"));
  if (!channel) return NextResponse.json({ error: "Canal no válido." }, { status: 400 });

  try {
    const rows = await sbSelect<Msg>(
      "messages",
      `select=id,member_email,sender,body,created_at&member_email=eq.${encodeURIComponent(channel)}&order=created_at.asc&limit=300`
    );
    return NextResponse.json({ ok: true, messages: rows });
  } catch (err) {
    console.error("[api/miembros/chat GET]", err);
    return NextResponse.json({ ok: true, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { body?: unknown; member?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!text) return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });

  const admin = isAdmin(email);
  const channel = channelFor(email, typeof body.member === "string" ? body.member : null);
  if (!channel) return NextResponse.json({ error: "Canal no válido." }, { status: 400 });

  const sender: "member" | "coach" = admin ? "coach" : "member";

  try {
    await sbInsert("messages", {
      member_email: channel,
      sender,
      body: text,
      read_by_coach: sender === "coach",
      read_by_member: sender === "member",
    });
  } catch (err) {
    console.error("[api/miembros/chat POST]", err);
    return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
  }

  // Avisos no bloqueantes (no afectan a la respuesta del POST).
  if (sender === "member") {
    // Escribe una clienta → email + push a la coach.
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (admins.length) {
      sendNewMessageNotice(admins, channel, text).catch((e) => console.error("[chat] aviso email falló", e));
      sendPushToEmails(admins, { title: `💬 Mensaje de ${channel}`, body: text.slice(0, 120), url: "/miembros/admin" })
        .catch((e) => console.error("[chat] push coach falló", e));
    }
  } else {
    // Responde la coach → push a la clienta de ese canal.
    sendPushToEmail(channel, { title: "Tu coach te ha respondido 💬", body: text.slice(0, 120), url: "/miembros/chat" })
      .catch((e) => console.error("[chat] push clienta falló", e));
  }

  return NextResponse.json({ ok: true });
}
