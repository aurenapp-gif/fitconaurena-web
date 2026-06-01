import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbUpdate } from "@/lib/supabase";
import { LEAD_STATUS_VALUES, type LeadStatus } from "@/lib/leads";

export const runtime = "nodejs";

// Actualiza el estado y/o las notas de un lead. Solo administración.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email || !isAdmin(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: { id?: unknown; status?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const id = typeof body.id === "number" || typeof body.id === "string" ? body.id : null;
  if (id === null || `${id}`.length === 0) {
    return NextResponse.json({ error: "Falta el lead." }, { status: 400 });
  }

  const patch: { status?: LeadStatus; notes?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !LEAD_STATUS_VALUES.includes(body.status as LeadStatus)) {
      return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    }
    patch.status = body.status as LeadStatus;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" || body.notes.length > 4000) {
      return NextResponse.json({ error: "Notas no válidas." }, { status: 400 });
    }
    patch.notes = body.notes;
  }

  try {
    // El id es numérico (bigint). Lo pasamos tal cual al filtro eq.
    await sbUpdate("leads", `id=eq.${encodeURIComponent(`${id}`)}`, patch);
  } catch (err) {
    console.error("[api/miembros/leads] update", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
