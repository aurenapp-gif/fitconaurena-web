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
  category: string;
  created_at: string;
};

const UUID = /^[0-9a-fA-F-]{36}$/;
const CATS = ["win", "receta"];

export async function GET(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const admin = isAdmin(email);
  const cat = CATS.includes(req.nextUrl.searchParams.get("category") ?? "") ? req.nextUrl.searchParams.get("category") : "win";

  try {
    const rows = await sbSelect<Post>("community_posts", `select=*&category=eq.${cat}&order=created_at.desc&limit=50`);
    // Avatares: mapa email -> photo_path (pocos perfiles, lo traemos entero).
    let avatarMap = new Map<string, string>();
    try {
      const profs = await sbSelect<{ email: string; photo_path: string | null }>("profiles", "select=email,photo_path");
      avatarMap = new Map(profs.filter((p) => p.photo_path).map((p) => [p.email, p.photo_path as string]));
    } catch { /* sin avatares si falla */ }

    // Likes: conteo por post + si el visitante ya dio me gusta.
    const likeCount = new Map<string, number>();
    const mine = new Set<string>();
    try {
      const likes = await sbSelect<{ post_id: string; member_email: string }>("community_likes", "select=post_id,member_email");
      for (const l of likes) {
        likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
        if (l.member_email === email) mine.add(l.post_id);
      }
    } catch { /* sin likes si falla */ }

    const posts = await Promise.all(
      rows.map(async (p) => ({
        id: p.id,
        author_name: p.author_name,
        body: p.body,
        created_at: p.created_at,
        canDelete: admin, // solo la coach puede borrar
        isCoach: isAdmin(p.author_email),
        likes: likeCount.get(p.id) ?? 0,
        liked: mine.has(p.id),
        photoUrl: p.photo_path ? await sbSignedUrl("comunidad", p.photo_path, 3600).catch(() => undefined) : undefined,
        avatarUrl: avatarMap.has(p.author_email)
          ? await sbSignedUrl("perfil", avatarMap.get(p.author_email)!, 3600).catch(() => undefined)
          : undefined,
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
  const category = CATS.includes(String(form.get("category") ?? "")) ? String(form.get("category")) : "win";
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
    await sbInsert("community_posts", { author_email: email, author_name: name, body: body || "", photo_path, category });
  } catch (err) {
    console.error("[comunidad POST]", err);
    return NextResponse.json({ error: "No se pudo publicar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "ID no válido." }, { status: 400 });

  try {
    const rows = await sbSelect<Post>("community_posts", `select=*&id=eq.${id}`);
    const post = rows[0];
    if (!post) return NextResponse.json({ ok: true });
    await sbDelete("community_posts", `id=eq.${id}`);
    if (post.photo_path) await sbDeleteObject("comunidad", post.photo_path);
  } catch (err) {
    console.error("[comunidad DELETE]", err);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
