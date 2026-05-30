import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbInsert, sbUpload, safePath } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function adminEmail(req: NextRequest): string | null {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return email && isAdmin(email) ? email : null;
}

export async function POST(req: NextRequest) {
  if (!adminEmail(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const file = form.get("file");

  if (!title) return NextResponse.json({ error: "Falta el título." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Adjunta un archivo." }, { status: 400 });
  }

  try {
    const path = safePath(file.name || "archivo");
    await sbUpload("contenido", path, await file.arrayBuffer(), file.type || "application/octet-stream");
    await sbInsert("content", { title, description: description || null, file_path: path });
  } catch (err) {
    console.error("[api/miembros/contenido] error", err);
    return NextResponse.json({ error: "No se pudo subir el contenido." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
