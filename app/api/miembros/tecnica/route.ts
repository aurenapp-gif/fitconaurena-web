import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbInsert, sbSelect, sbDelete, sbDeleteObject } from "@/lib/supabase";
import { sendTechniqueUploadNotice } from "@/lib/mailer";

export const runtime = "nodejs";

// La clienta registra un vídeo de técnica ya subido a Storage (vía /sign).
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Acceso no disponible." }, { status: 403 });

  let body: { exercise?: unknown; note?: unknown; video_path?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const exercise = typeof body.exercise === "string" ? body.exercise.trim().slice(0, 120) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const video_path = typeof body.video_path === "string" ? body.video_path : "";
  if (!video_path) return NextResponse.json({ error: "Falta el vídeo." }, { status: 400 });

  try {
    await sbInsert("technique_reviews", {
      member_email: email,
      exercise: exercise || null,
      note: note || null,
      video_path,
    });
  } catch (e) {
    console.error("[tecnica] insert", e);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }

  // Aviso a la coach (no bloquea la respuesta).
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length) {
    sendTechniqueUploadNotice(admins, email, exercise).catch((e) => console.error("[tecnica] aviso", e));
  }

  return NextResponse.json({ ok: true });
}

// Borrar un vídeo de técnica: la clienta el suyo; la coach cualquiera.
export async function DELETE(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: { id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Falta el vídeo." }, { status: 400 });

  try {
    const rows = await sbSelect<{ member_email: string; video_path: string | null; coach_reply_path: string | null }>(
      "technique_reviews",
      `select=member_email,video_path,coach_reply_path&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: true });
    if (row.member_email !== email && !isAdmin(email)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    if (row.video_path) await sbDeleteObject("tecnica", row.video_path);
    if (row.coach_reply_path) await sbDeleteObject("tecnica", row.coach_reply_path);
    await sbDelete("technique_reviews", `id=eq.${encodeURIComponent(id)}`);
  } catch (e) {
    console.error("[tecnica] delete", e);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
