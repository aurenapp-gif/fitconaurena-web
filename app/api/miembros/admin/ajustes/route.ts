import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { AJUSTE_SALA, guardarAjuste } from "@/lib/ajustes";
import { safeLink } from "@/lib/suplementos";
import { isMissingTable } from "@/lib/supabase";

export const runtime = "nodejs";

/** Guarda el enlace de la sala de la videollamada. Solo la coach. */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { call_url?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const raw = typeof data.call_url === "string" ? data.call_url.trim() : "";
  // Vacío = volver al enlace de respaldo. Con algo escrito, tiene que ser un
  // enlace https de verdad: guardar basura ahí deja a las clientas sin sala.
  const url = raw === "" ? null : safeLink(raw);
  if (raw !== "" && !url) return NextResponse.json({ error: "El enlace tiene que empezar por https://" }, { status: 400 });

  try {
    await guardarAjuste(AJUSTE_SALA, url, me);
  } catch (err) {
    console.error("[admin/ajustes] call_url", err);
    if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la tabla app_settings (supabase/ajustes.sql)." }, { status: 400 });
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, call_url: url });
}
