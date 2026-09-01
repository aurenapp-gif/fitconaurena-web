import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbUpsert, sbUpdate, isMissingTable } from "@/lib/supabase";
import { MAX_OPCIONES } from "@/lib/votaciones";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Voto de una clienta en la votación de un comunicado.
 *
 * Un voto por clienta y comunicado: cambiar de opinión ACTUALIZA el que hay
 * —lo garantiza el índice único de la tabla—, no añade otro.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let data: { id?: unknown; option?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Comunicado no válido." }, { status: 400 });

  const option = typeof data.option === "number" ? Math.trunc(data.option) : NaN;
  if (!Number.isInteger(option) || option < 0 || option >= MAX_OPCIONES) {
    return NextResponse.json({ error: "Opción no válida." }, { status: 400 });
  }

  // Manda el comunicado, no lo que llegue en la petición: se comprueba que
  // tenga votación, que siga abierta y que la opción exista de verdad. Sin
  // esto, cualquiera con sesión podría votar en un comunicado sin votación o
  // elegir una opción que no está en pantalla.
  let fila: { poll_options: string[] | null; poll_closed_at: string | null } | undefined;
  try {
    const filas = await sbSelect<{ poll_options: string[] | null; poll_closed_at: string | null }>(
      "announcements",
      `select=poll_options,poll_closed_at&id=eq.${id}&limit=1`
    );
    fila = filas[0];
  } catch (err) {
    console.error("[voto] leer comunicado", err);
    if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la tabla.", setup: true }, { status: 400 });
    return NextResponse.json({ error: "No se pudo votar." }, { status: 500 });
  }

  if (!fila) return NextResponse.json({ error: "Ese comunicado ya no existe." }, { status: 404 });
  const opciones = Array.isArray(fila.poll_options) ? fila.poll_options : null;
  if (!opciones) return NextResponse.json({ error: "Este comunicado no tiene votación." }, { status: 400 });
  if (fila.poll_closed_at) return NextResponse.json({ error: "La votación ya está cerrada." }, { status: 400 });
  if (option >= opciones.length) return NextResponse.json({ error: "Opción no válida." }, { status: 400 });

  try {
    await sbUpsert(
      "announcement_votes",
      { announcement_id: id, member_email: me, option_index: option, updated_at: new Date().toISOString() },
      "announcement_id,member_email"
    );
  } catch (err) {
    console.error("[voto] guardar", err);
    if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la tabla de votos.", setup: true }, { status: 400 });
    return NextResponse.json({ error: "No se pudo guardar tu voto." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Cierra o reabre la votación. Solo la coach. Cerrar no borra: el resultado
 * se sigue viendo, lo que se corta es la entrada de votos nuevos. */
export async function PATCH(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { id?: unknown; cerrar?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Comunicado no válido." }, { status: 400 });

  try {
    await sbUpdate("announcements", `id=eq.${id}`, {
      poll_closed_at: data.cerrar === true ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("[voto] cerrar", err);
    return NextResponse.json({ error: "No se pudo cambiar la votación." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
