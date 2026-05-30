import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbInsertIgnore, sbDelete } from "@/lib/supabase";

export const runtime = "nodejs";
const UUID = /^[0-9a-fA-F-]{36}$/;

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  try {
    const existing = await sbSelect(
      "community_likes",
      `select=post_id&post_id=eq.${id}&member_email=eq.${encodeURIComponent(email)}`
    );
    let liked: boolean;
    if (existing.length) {
      await sbDelete("community_likes", `post_id=eq.${id}&member_email=eq.${encodeURIComponent(email)}`);
      liked = false;
    } else {
      // ignore-duplicates: si un doble clic envía dos inserts a la vez, la
      // restricción UNIQUE (post_id, member_email) evita el duplicado sin error.
      await sbInsertIgnore("community_likes", { post_id: id, member_email: email });
      liked = true;
    }
    const all = await sbSelect("community_likes", `select=post_id&post_id=eq.${id}`);
    return NextResponse.json({ ok: true, liked, count: all.length });
  } catch (err) {
    console.error("[comunidad/like]", err);
    return NextResponse.json({ error: "No se pudo procesar el me gusta." }, { status: 500 });
  }
}
