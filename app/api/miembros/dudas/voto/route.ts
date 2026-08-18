import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { sbInsertIgnore, sbDelete, sbSelect, isMissingTable } from "@/lib/supabase";
import { voterHash } from "@/lib/dudasVoto";

export const runtime = "nodejs";
export const maxDuration = 15;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "A mí también me pasa": marca o desmarca el interés en una duda.
 *
 * Se guarda el HMAC del correo, no el correo. Así se evita que la misma persona
 * vote dos veces sin llegar a saber a quién le interesa qué, que en un buzón
 * con temas de comida o de cabeza no es un detalle menor.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { id?: unknown; on?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Duda no válida." }, { status: 400 });

  const hash = voterHash(me);
  const on = data.on === true;

  try {
    if (on) {
      // Ignora duplicados: dos toques seguidos no dan error.
      await sbInsertIgnore("duda_likes", { duda_id: id, voter_hash: hash });
    } else {
      await sbDelete("duda_likes", `duda_id=eq.${id}&voter_hash=eq.${hash}`);
    }
    const rows = await sbSelect<{ duda_id: string }>("duda_likes", `select=duda_id&duda_id=eq.${id}`);
    return NextResponse.json({ ok: true, likes: rows.length, mine: on });
  } catch (err) {
    console.error("[dudas] voto", err);
    if (isMissingTable(err)) {
      return NextResponse.json({ error: "Falta crear la tabla de dudas en la base de datos.", setup: true }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo registrar tu voto." }, { status: 500 });
  }
}
