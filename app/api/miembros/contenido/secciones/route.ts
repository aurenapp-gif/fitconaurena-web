import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbInsert, sbSelect, sbUpdate, sbDelete } from "@/lib/supabase";

export const runtime = "nodejs";

function isAdminReq(req: NextRequest): boolean {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return !!email && isAdmin(email);
}

type Section = { id: number; name: string; position: number };

// Crear una sección nueva (al final del orden).
export async function POST(req: NextRequest) {
  if (!isAdminReq(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let body: { name?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return NextResponse.json({ error: "Pon un nombre a la sección." }, { status: 400 });
  try {
    const last = await sbSelect<Section>("content_sections", "select=position&order=position.desc&limit=1");
    const position = (last[0]?.position ?? 0) + 1;
    await sbInsert("content_sections", { name, position });
  } catch (e) {
    console.error("[secciones] crear", e);
    return NextResponse.json({ error: "No se pudo crear." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Renombrar (name) o mover arriba/abajo (dir).
export async function PATCH(req: NextRequest) {
  if (!isAdminReq(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let body: { id?: unknown; name?: unknown; dir?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof body.id === "number" ? body.id : Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Falta la sección." }, { status: 400 });

  try {
    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, 60);
      if (!name) return NextResponse.json({ error: "Nombre vacío." }, { status: 400 });
      await sbUpdate("content_sections", `id=eq.${id}`, { name });
    } else if (body.dir === "up" || body.dir === "down") {
      const all = await sbSelect<Section>("content_sections", "select=id,name,position&order=position.asc");
      const idx = all.findIndex((s) => Number(s.id) === id);
      const swapIdx = body.dir === "up" ? idx - 1 : idx + 1;
      if (idx >= 0 && swapIdx >= 0 && swapIdx < all.length) {
        const a = all[idx], b = all[swapIdx];
        await sbUpdate("content_sections", `id=eq.${a.id}`, { position: b.position });
        await sbUpdate("content_sections", `id=eq.${b.id}`, { position: a.position });
      }
    }
  } catch (e) {
    console.error("[secciones] actualizar", e);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Borrar una sección (el contenido que tuviera queda sin sección, no se borra).
export async function DELETE(req: NextRequest) {
  if (!isAdminReq(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let body: { id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof body.id === "number" ? body.id : Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Falta la sección." }, { status: 400 });
  try {
    await sbUpdate("content", `section_id=eq.${id}`, { section_id: null });
    await sbDelete("content_sections", `id=eq.${id}`);
  } catch (e) {
    console.error("[secciones] borrar", e);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
