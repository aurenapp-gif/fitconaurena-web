import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { sbUpdate } from "@/lib/supabase";
import { macrosValidos } from "@/lib/nutricion";

export const runtime = "nodejs";

/**
 * Las calorías y la proteína que pauta un plan de alimentación. Solo la coach.
 *
 * Es el dato que le falta al analizador para poder decir algo preciso de la
 * comida: con él se sabe si la pauta se queda corta de proteína y si lo que
 * pasa con el peso cuadra con lo que se come.
 *
 * Body: { planId, kcal, proteina }  — vacío borra el valor.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !(await puedeGestionarClientas(me))) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { planId?: unknown; kcal?: unknown; proteina?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(planId)) return NextResponse.json({ error: "Plan no válido." }, { status: 400 });

  // Un número fuera de rango se guarda como vacío en vez de como dato: más
  // vale no saberlo que calcular con 150 kcal porque se coló un cero.
  const { kcal, proteina } = macrosValidos(body.kcal, body.proteina);

  try {
    await sbUpdate("plans", `id=eq.${planId}`, { kcal, protein_g: proteina });
  } catch (err) {
    console.error("[plan/macros]", err);
    return NextResponse.json({ error: "No se pudo guardar. ¿Has ejecutado supabase/nutricion.sql?" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, kcal, proteina });
}
