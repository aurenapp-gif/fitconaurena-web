import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbUpdate } from "@/lib/supabase";
import { sendTechniqueReplyEmail } from "@/lib/mailer";
import { verifyPath } from "@/lib/token";

export const runtime = "nodejs";

// La coach responde a un vídeo de técnica (texto + vídeo de respuesta opcional).
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { id?: unknown; reply?: unknown; reply_path?: unknown; pathToken?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = String(body.id ?? "").trim();
  const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 2000) : "";
  const reply_path = typeof body.reply_path === "string" && body.reply_path ? body.reply_path : null;
  const pathToken = typeof body.pathToken === "string" ? body.pathToken : "";
  if (!id) return NextResponse.json({ error: "Falta el vídeo." }, { status: 400 });
  if (!reply && !reply_path) return NextResponse.json({ error: "Escribe una corrección o adjunta un vídeo." }, { status: 400 });
  // Si adjunta vídeo, su ruta debe venir firmada por /sign.
  if (reply_path && !verifyPath(reply_path, pathToken)) {
    return NextResponse.json({ error: "Vídeo de respuesta no válido." }, { status: 400 });
  }

  let memberEmail = "";
  try {
    const rows = await sbSelect<{ member_email: string }>(
      "technique_reviews",
      `select=member_email&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    memberEmail = rows[0]?.member_email ?? "";
    await sbUpdate("technique_reviews", `id=eq.${encodeURIComponent(id)}`, {
      coach_reply: reply || null,
      coach_reply_path: reply_path,
      coach_reply_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[tecnica/responder]", e);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }

  if (memberEmail) {
    sendTechniqueReplyEmail(memberEmail).catch((e) => console.error("[tecnica] aviso clienta", e));
  }
  return NextResponse.json({ ok: true });
}
