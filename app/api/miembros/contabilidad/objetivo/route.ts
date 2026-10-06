import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { guardarObjetivo } from "@/lib/objetivos";
import { isMissingTable } from "@/lib/supabase";

export const runtime = "nodejs";

/** El objetivo de facturación de un mes. Solo la coach: es su número. */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { mes?: unknown; importe?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const mes = typeof body.mes === "string" && /^\d{4}-\d{2}$/.test(body.mes) ? body.mes : "";
  if (!mes) return NextResponse.json({ error: "Mes no válido." }, { status: 400 });

  const texto = typeof body.importe === "string" ? body.importe.trim() : "";
  if (texto === "") {
    try { await guardarObjetivo(mes, null, me); } catch (e) {
      console.error("[objetivo] quitar", e);
      return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, objetivo: null });
  }

  const euros = Number(texto.replace(/[^\d]/g, ""));
  // Un tope alto pero real: evita que un dedazo ponga un objetivo de millones
  // y deje la barra en el 0 % para siempre.
  if (!Number.isFinite(euros) || euros <= 0 || euros > 1_000_000) {
    return NextResponse.json({ error: "Pon un objetivo entre 1 € y 1.000.000 €." }, { status: 400 });
  }

  try {
    await guardarObjetivo(mes, Math.round(euros * 100), me);
  } catch (e) {
    console.error("[objetivo] guardar", e);
    if (isMissingTable(e)) {
      return NextResponse.json({ error: "Falta crear la tabla app_settings (supabase/ajustes.sql)." }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, objetivo: Math.round(euros * 100) });
}
