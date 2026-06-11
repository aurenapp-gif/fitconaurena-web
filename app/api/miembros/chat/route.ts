import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbInsert, sbUpload, sbSignedUrl, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { sendNewMessageNotice } from "@/lib/mailer";
import { sendPushToEmail, sendPushToEmails } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = {
  id: string;
  member_email: string;
  sender: "member" | "coach";
  body: string;
  audio_path: string | null;
  created_at: string;
  read_by_coach: boolean;
  read_by_member: boolean;
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
      `select=id,member_email,sender,body,audio_path,created_at,read_by_coach,read_by_member&member_email=eq.${encodeURIComponent(channel)}&order=created_at.asc&limit=300`
    );
    // Firma las URLs de las notas de voz (la caché interna evita re-firmar en cada poll).
    const messages = await Promise.all(
      rows.map(async (m) => ({
        ...m,
        audio_url: m.audio_path ? await sbSignedUrl("chat-audio", m.audio_path, 3600).catch(() => undefined) : undefined,
      }))
    );
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    console.error("[api/miembros/chat GET]", err);
    return NextResponse.json({ ok: true, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  // Dos formatos: JSON (texto) o multipart (nota de voz).
  let text = "";
  let memberParam: string | null = null;
  let audioFile: File | null = null;

  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    let form: FormData;
    try { form = await req.formData(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Adjunta un audio." }, { status: 400 });
    }
    const invalid = validateUpload(audio, "audio");
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    audioFile = audio;
    text = "🎤 Nota de voz";
    const m = form.get("member");
    memberParam = typeof m === "string" ? m : null;
  } else {
    let body: { body?: unknown; member?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }
    text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
    if (!text) return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
    memberParam = typeof body.member === "string" ? body.member : null;
  }

  const admin = isAdmin(email);
  const channel = channelFor(email, memberParam);
  if (!channel) return NextResponse.json({ error: "Canal no válido." }, { status: 400 });

  const sender: "member" | "coach" = admin ? "coach" : "member";

  try {
    let audio_path: string | null = null;
    if (audioFile) {
      audio_path = safePath(audioFile.name || "nota.webm");
      // Sin el sufijo ";codecs=..." para que el bucket acepte el tipo.
      const mime = (audioFile.type || "audio/webm").split(";")[0];
      await sbUpload("chat-audio", audio_path, await audioFile.arrayBuffer(), mime);
    }
    await sbInsert("messages", {
      member_email: channel,
      sender,
      body: text,
      audio_path,
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
