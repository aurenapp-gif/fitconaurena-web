import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbUpsert } from "@/lib/supabase";
import { parseDiaCiclo } from "@/lib/habitos";

export const runtime = "nodejs";

function todayMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

// Guarda (upsert) el registro de hábitos de HOY de la clienta. Idempotente por
// la clave (member_email, day): volver a guardar el mismo día actualiza la fila.
//
// El agua llega en VASOS (enteros): en pantalla se enseña en litros, pero un
// paso del contador es un vaso, así que no hay decimales que guardar.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { water?: unknown; steps?: unknown; sleep?: unknown; cycle_day?: unknown; energy?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const num = (v: unknown, max: number): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
  };
  const energia = num(body.energy, 5);

  const fila = {
    member_email: email,
    day: todayMadrid(),
    water: num(body.water, 40),
    steps: num(body.steps, 100000),
    sleep: num(body.sleep, 24),
    updated_at: new Date().toISOString(),
  };
  const extra = { cycle_day: parseDiaCiclo(body.cycle_day), energy: energia != null && energia >= 1 ? Math.round(energia) : null };

  try {
    await sbUpsert("habit_logs", { ...fila, ...extra });
  } catch (err) {
    // Si las columnas de ciclo y energía aún no existen (falta ejecutar
    // supabase/para-ellas.sql), se guarda lo demás igualmente.
    try {
      await sbUpsert("habit_logs", fila);
      console.error("[api/miembros/habitos] sin ciclo/energía (¿falta la migración?)", err);
    } catch (err2) {
      console.error("[api/miembros/habitos]", err2);
      return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
