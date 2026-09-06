import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbUpdate, sbSelect } from "@/lib/supabase";
import { sendCheckinReplyEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";

export const runtime = "nodejs";

// Solo la coach (admin) responde a un check-in.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: { id?: unknown; reply?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 2000) : "";
  if (!id || !reply) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }

  // El id va directo al filtro de PostgREST, así que solo se admite un uuid
  // exacto: nada de caracteres que puedan cambiar el sentido de la consulta.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "ID no válido." }, { status: 400 });
  }

  try {
    await sbUpdate("check_ins", `id=eq.${id}`, {
      coach_reply: reply,
      coach_reply_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/miembros/checkin/responder] error", err);
    return NextResponse.json({ error: "No se pudo guardar la respuesta." }, { status: 500 });
  }

  // Aviso por email a la clienta (no bloqueante).
  try {
    const rows = await sbSelect<{ member_email: string }>("check_ins", `select=member_email&id=eq.${id}`);
    if (rows[0]?.member_email) {
      await sendCheckinReplyEmail(rows[0].member_email);
      sendPushToEmail(rows[0].member_email, {
        title: "Tu coach te ha escrito",
        body: "Entra para ver sus comentarios.",
        url: "/miembros/checkins",
      }).catch((e) => console.error("[responder] push falló", e));
    }
  } catch (err) {
    console.error("[responder] email", err);
  }

  return NextResponse.json({ ok: true });
}
