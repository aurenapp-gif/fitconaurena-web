import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbInsert } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Deja constancia de un fallo al subir un plan.
 *
 * El error ocurre en el navegador de la coach y hasta ahora se quedaba en su
 * pantalla: para saber qué pasaba había que pedirle que copiara el mensaje.
 * Guardándolo se puede mirar directamente, con el paso, el tamaño del archivo y
 * el navegador.
 *
 * NUNCA falla hacia fuera: esto es diagnóstico, y un problema registrando el
 * fallo no debe añadir ruido encima del fallo que se está intentando entender.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ ok: false }, { status: 403 });

  try {
    const d = await req.json();
    const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
    await sbInsert("upload_errors", {
      paso: texto(d.paso, 40),
      mensaje: texto(d.mensaje, 500),
      via: d.via === "servidor" ? "servidor" : "directa",
      bytes: typeof d.bytes === "number" && Number.isFinite(d.bytes) ? Math.round(d.bytes) : null,
      mime: texto(d.mime, 120),
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
    });
  } catch (e) {
    console.error("[plan/incidencia]", e);
  }
  return NextResponse.json({ ok: true });
}
