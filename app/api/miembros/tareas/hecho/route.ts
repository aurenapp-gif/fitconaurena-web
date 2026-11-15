import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { esEquipo } from "@/lib/equipo";
import { sbInsert, sbDelete, sbSelect } from "@/lib/supabase";
import { hoyMadrid } from "@/lib/renovaciones";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marcar o desmarcar una tarea como hecha HOY.
 *
 * Marcar es crear una fila; desmarcar es borrarla. Guardar un «no» explícito
 * no aporta nada —no haberla hecho ya es no tener fila— y llenaría el
 * histórico de ruido.
 *
 * El día lo pone el SERVIDOR, no quien llama: si viniera de fuera, se podría
 * marcar como hecho ayer algo que no se hizo, y el registro dejaría de valer
 * para nada.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // La coach también marca: puede tener tareas suyas en la lista.
  if (!isAdmin(me) && !(await esEquipo(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let b: { id?: unknown; hecha?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof b.id === "string" ? b.id.trim() : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Tarea no válida." }, { status: 400 });
  const hecha = b.hecha !== false;

  const dia = hoyMadrid();
  const email = me.toLowerCase();

  try {
    if (hecha) {
      // Que exista de verdad y esté en pie: si no, una tarea retirada se
      // podría seguir marcando desde una pantalla vieja abierta.
      const t = await sbSelect<{ id: string }>("staff_tasks", `select=id&id=eq.${id}&activa=is.true&limit=1`);
      if (t.length === 0) return NextResponse.json({ error: "Esa tarea ya no está." }, { status: 404 });
      try {
        await sbInsert("staff_task_done", { task_id: id, email, dia });
      } catch (err) {
        // Marcar dos veces el mismo día es la misma marca: el índice único lo
        // rechaza y aquí no es un error, es que ya estaba.
        const msg = err instanceof Error ? err.message : "";
        if (!/duplicate|unique|23505/i.test(msg)) throw err;
      }
    } else {
      await sbDelete("staff_task_done", `task_id=eq.${id}&email=eq.${encodeURIComponent(email)}&dia=eq.${dia}`);
    }
  } catch (err) {
    console.error("[tareas/hecho]", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, dia, hecha });
}
