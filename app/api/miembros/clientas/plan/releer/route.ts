import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { sbSelect, sbUpdate } from "@/lib/supabase";
import { leerPlan, type PlanLeible } from "@/lib/planes";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Volver a leer un plan que quedó marcado como ilegible.
 *
 * POR QUÉ HACE FALTA. La lectura se intenta UNA vez y, si falla, el plan queda
 * marcado y no se vuelve a intentar nunca: sin eso, cada visita de la clienta
 * y cada pregunta a FitAI releerían el PDF entero, que tarda y cuesta.
 *
 * El problema es que un fallo de una tarde —el modelo que ese día no se aclara
 * con el archivo, una caída— condenaba el plan para siempre. La clienta se
 * quedaba con un «no he podido sacar los ejercicios» que no se arreglaba ni
 * volviendo a entrar, y nadie se enteraba salvo ella.
 *
 * Esto borra la marca y lo intenta de nuevo, a mano y cuando la coach quiere.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !(await puedeGestionarClientas(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: { id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Plan no válido." }, { status: 400 });

  let plan: PlanLeible | undefined;
  try {
    const filas = await sbSelect<PlanLeible>("plans", `select=id,type,file_path,contenido,contenido_at,estructura&id=eq.${id}`);
    plan = filas[0];
  } catch (e) {
    console.error("[releer] buscar", e);
    return NextResponse.json({ error: "No se pudo leer el plan." }, { status: 502 });
  }
  if (!plan?.file_path) return NextResponse.json({ error: "Ese plan no tiene archivo." }, { status: 404 });

  // Fuera la marca: sin ella, `leerPlan` vuelve a intentarlo de verdad.
  try {
    await sbUpdate("plans", `id=eq.${encodeURIComponent(id)}`, { estructura: null, contenido: null, contenido_at: null });
  } catch (e) {
    console.error("[releer] limpiar", e);
    return NextResponse.json({ error: "No se pudo volver a intentarlo." }, { status: 502 });
  }

  const leido = await leerPlan({ ...plan, estructura: null, contenido: null, contenido_at: null }).catch(() => null);
  const dias = leido?.estructura?.tipo === "entrenamiento" ? leido.estructura.dias : [];
  const ejercicios = dias.reduce((n, d) => n + d.ejercicios.length, 0);

  return NextResponse.json({
    ok: true,
    leido: !!leido?.estructura,
    ejercicios,
    // Lo que la coach necesita saber para decidir qué hacer a continuación.
    mensaje: leido?.estructura
      ? `Leído: ${ejercicios} ${ejercicios === 1 ? "ejercicio" : "ejercicios"}.`
      : "Sigue sin poder leerse. Prueba a subirlo otra vez, o escribe los ejercicios a mano al subirlo.",
  });
}
