import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbUpsert, sbDelete } from "@/lib/supabase";
import { normalizarFases, faseEnCurso, type Fase } from "@/lib/estrategia";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * El mapa de fases de una clienta. Solo la coach.
 *
 * Body: { email, fases: [{titulo, detalle}], actual: number | null }
 *
 * Se guarda el mapa ENTERO de una vez, que es como se edita. Para no dejar a
 * la clienta un rato sin mapa, no se borra y se vuelve a insertar: se escribe
 * encima posición a posición y al final se quitan las que sobran. Si algo
 * falla a mitad, lo que queda es el mapa viejo con las primeras fases ya
 * cambiadas, nunca un mapa vacío.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; fases?: unknown; actual?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  if (isAdmin(email)) return NextResponse.json({ error: "La coach no lleva mapa." }, { status: 400 });

  const fases = normalizarFases(body.fases);
  const actual = faseEnCurso(fases, body.actual);
  const ahora = new Date().toISOString();

  try {
    for (const f of fases) {
      await sbUpsert(
        "strategy_phases",
        { member_email: email, posicion: f.posicion, titulo: f.titulo, detalle: f.detalle, updated_at: ahora },
        "member_email,posicion"
      );
    }
    await sbDelete(
      "strategy_phases",
      `member_email=eq.${encodeURIComponent(email)}&posicion=gt.${fases.length}`
    );
    // `strategy_phase` va en su ficha: es dónde está ella, no una fase del mapa.
    await sbUpsert("profiles", { email, strategy_phase: actual, updated_at: ahora });
  } catch (err) {
    console.error("[estrategia] guardar", err);
    return NextResponse.json({ error: "No se pudo guardar el mapa." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, fases: fases.length, actual });
}

/**
 * Copia el mapa de otra clienta, para no escribir seis fases veinticinco
 * veces. Copia los textos, NO por dónde va la otra: cada una empieza por la
 * fase que le toque.
 *
 * Body: { email, desde }
 */
export async function PUT(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; desde?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const desde = typeof body.desde === "string" ? normalizeEmail(body.desde) : "";
  if (!isValidEmail(email) || !isValidEmail(desde)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  if (email === desde) return NextResponse.json({ error: "Es la misma clienta." }, { status: 400 });

  try {
    const origen = await sbSelect<Fase>(
      "strategy_phases",
      `select=posicion,titulo,detalle&member_email=eq.${encodeURIComponent(desde)}&order=posicion.asc`
    );
    if (origen.length === 0) return NextResponse.json({ error: "Esa clienta no tiene mapa." }, { status: 404 });

    const fases = normalizarFases(origen);
    const ahora = new Date().toISOString();
    for (const f of fases) {
      await sbUpsert(
        "strategy_phases",
        { member_email: email, posicion: f.posicion, titulo: f.titulo, detalle: f.detalle, updated_at: ahora },
        "member_email,posicion"
      );
    }
    await sbDelete(
      "strategy_phases",
      `member_email=eq.${encodeURIComponent(email)}&posicion=gt.${fases.length}`
    );
    return NextResponse.json({ ok: true, fases: fases.length });
  } catch (err) {
    console.error("[estrategia] copiar", err);
    return NextResponse.json({ error: "No se pudo copiar el mapa." }, { status: 502 });
  }
}
