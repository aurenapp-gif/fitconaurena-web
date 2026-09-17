import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { rateLimit } from "@/lib/ratelimit";
import { sbDelete, sbInsertIgnore } from "@/lib/supabase";
import { claveComida } from "@/lib/dia";
import { hoyMadrid } from "@/lib/renovaciones";

export const runtime = "nodejs";

/** Marcar y desmarcar es barato, pero no infinito. */
const LIMITE_HORA = 120;

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });
  if (!rateLimit(`comidas:${email}`, LIMITE_HORA, 3600_000)) {
    return NextResponse.json({ error: "Demasiados cambios seguidos." }, { status: 429 });
  }

  let body: { comida?: unknown; hecha?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const comida = claveComida(typeof body.comida === "string" ? body.comida : "");
  if (!comida) return NextResponse.json({ error: "Falta la comida." }, { status: 400 });

  // El día se decide AQUÍ, en horario de Madrid. Si viniera del navegador, un
  // móvil con la zona horaria cambiada marcaría la comida en otro día.
  const day = hoyMadrid();

  try {
    if (body.hecha === false) {
      await sbDelete("meal_logs", `member_email=eq.${encodeURIComponent(email)}&day=eq.${day}&comida=eq.${encodeURIComponent(comida)}`);
    } else {
      await sbInsertIgnore("meal_logs", { member_email: email, day, comida }, "member_email,day,comida");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[comidas]", e);
    return NextResponse.json({ error: "No se ha podido guardar." }, { status: 500 });
  }
}
