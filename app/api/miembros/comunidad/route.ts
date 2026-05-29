import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbInsert, sbDelete, sbUpload, sbDeleteObject, sbSignedUrl, safePath } from "@/lib/supabase";

export const runtime = "nodejs";

type Post = {
  id: string;
  author_email: string;
  author_name: string;
  body: string;
  photo_path: string | null;
  created_at: string;
};

const UUID = /^[0-9a-fA-F-]{36}$/;

export async function GET(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const admin = isAdmin(email);

  try {
    const rows = await sbSelect<Post>("community_posts", "select=*&order=created_at.desc&limit=50");
    const posts = await Promise.all(
      rows.map(async (p) => ({
        id: p.id,
        author_name: p.author_name,
        body: p.body,
        created_at: p.created_at,
        // No exponemos el email; solo si el visitante puede borrar.
        canDelete: admin || p.author_email === email,
        photoUrl: p.photo_path ? await sbSignedUrl("comunidad", p.photo_path, 3600).catch(() => undefined) : undefined,
      }))
    );
    return NextResponse.json({ ok: true, posts });
  } catch (err) {
    console.error("[comunidad GET]", err);
    return NextResponse.json({ ok: true, posts: [] });
  }
}

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  const nameRaw = String(form.get("name") ?? "").trim().slice(0, 40);
  const name = nameRaw || email.split("@")[0];
  const photo = form.get("photo");

  if (!body && !(photo instanceof File && photo.size > 0)) {
    return NextResponse.json({ error: "Escribe algo o adjunta una foto." }, { status: 400 });
  }

  try {
    let photo_path: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      photo_path = safePath(photo.name || "foto");
      await sbUpload("comunidad", photo_path, await photo.arrayBuffer(), photo.type || "image/jpeg");
    }
    await sbInsert("community_posts", { author_email: email, author_name: name, body: body || "", photo_path });
  } catch (err) {
    console.error("[comunidad POST]", err);
    return NextResponse.json({ error: "No se pudo publicar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  try {
    const rows = await sbSelect<Post>("community_posts", `select=*&id=eq.${id}`);
    const post = rows[0];
    if (!post) return NextResponse.json({ ok: true });
    if (post.author_email !== email && !isAdmin(email)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    await sbDelete("community_posts", `id=eq.${id}`);
    if (post.photo_path) await sbDeleteObject("comunidad", post.photo_path);
  } catch (err) {
    console.error("[comunidad DELETE]", err);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
