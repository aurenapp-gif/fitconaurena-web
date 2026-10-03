import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbDelete, sbInsert } from "@/lib/supabase";
import { METODOS, MAX_CENT, CATEGORIAS_GASTO, fechaValida, importeACent } from "@/lib/contabilidad";
import { importarContratosFirmados } from "@/lib/ventas-auto";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo la coach. Aquí está el dinero del negocio. */
function soloCoach(req: NextRequest): string | null {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return me && isAdmin(me) ? me : null;
}

/**
 * Apunta una venta (lo que se ha comprometido a pagar) o un cobro (lo que ha
 * entrado). Son dos cosas distintas y se apuntan por separado a propósito.
 */
export async function POST(req: NextRequest) {
  const me = soloCoach(req);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const tipo = body.tipo === "cobro" ? "cobro" : body.tipo === "venta" ? "venta"
    : body.tipo === "gasto" ? "gasto" : null;
  if (!tipo) return NextResponse.json({ error: "Di si es una venta, un cobro o un gasto." }, { status: 400 });

  // En un gasto la clienta es opcional: una comisión va asociada a quien
  // recomendó, pero la publicidad o una herramienta no van con nadie.
  const member = typeof body.member === "string" ? normalizeEmail(body.member) : "";
  if (tipo !== "gasto" && !isValidEmail(member)) {
    return NextResponse.json({ error: "Elige una clienta." }, { status: 400 });
  }

  const importe_cent = importeACent(body.importe);
  if (importe_cent === null || importe_cent <= 0) {
    return NextResponse.json({ error: "Ese importe no se puede guardar. Revísalo." }, { status: 400 });
  }
  if (importe_cent > MAX_CENT) {
    return NextResponse.json({ error: "Ese importe es demasiado grande." }, { status: 400 });
  }

  const fecha = fechaValida(body.fecha);
  if (!fecha) return NextResponse.json({ error: "Esa fecha no vale." }, { status: 400 });

  // El método se comprueba contra la lista: del navegador no se acepta texto
  // libre donde luego se va a agrupar por método.
  const metodo = typeof body.metodo === "string" && (METODOS as readonly string[]).includes(body.metodo)
    ? body.metodo : null;
  const nota = typeof body.nota === "string" ? body.nota.trim().slice(0, 200) || null : null;
  const concepto = typeof body.concepto === "string" ? body.concepto.trim().slice(0, 120) || null : null;

  try {
    if (tipo === "gasto") {
      const categoria = typeof body.categoria === "string" && (CATEGORIAS_GASTO as readonly string[]).includes(body.categoria)
        ? body.categoria : null;
      await sbInsert("gastos", {
        concepto, importe_cent, fecha, categoria,
        member_email: isValidEmail(member) ? member : null,
        nota, created_by: me,
      });
    } else if (tipo === "venta") {
      await sbInsert("ventas", { member_email: member, concepto, importe_cent, fecha, metodo, nota });
    } else {
      const venta_id = typeof body.venta === "string" && UUID.test(body.venta) ? body.venta : null;
      await sbInsert("cobros", { member_email: member, venta_id, importe_cent, fecha, metodo, nota });
    }
  } catch (e) {
    console.error("[contabilidad] guardar", e);
    return NextResponse.json({
      error: "No se pudo guardar. Si es la primera vez, falta ejecutar supabase/contabilidad.sql.",
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Borra un apunte equivocado. `?tipo=venta|cobro&id=<uuid>`. */
export async function DELETE(req: NextRequest) {
  if (!soloCoach(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const tipo = p.get("tipo") === "cobro" ? "cobros" : p.get("tipo") === "venta" ? "ventas"
    : p.get("tipo") === "gasto" ? "gastos" : null;
  const id = p.get("id") ?? "";
  if (!tipo || !UUID.test(id)) return NextResponse.json({ error: "Apunte no válido." }, { status: 400 });

  try {
    await sbDelete(tipo, `id=eq.${id}`);
  } catch (e) {
    console.error("[contabilidad] borrar", e);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Pone al día la contabilidad con los contratos ya firmados.
 *
 * Es idempotente: cada contrato lleva su llave (`origen`), así que pulsar esto
 * dos veces no apunta nada dos veces. Lo que la coach escribió a mano no se
 * toca.
 */
export async function PUT(req: NextRequest) {
  if (!soloCoach(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  try {
    const r = await importarContratosFirmados();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[contabilidad] importar", e);
    return NextResponse.json({
      error: "No se pudo importar. Ejecuta esto en Supabase: alter table public.ventas add column if not exists origen text; create unique index if not exists ventas_origen_idx on public.ventas (origen);",
    }, { status: 502 });
  }
}
