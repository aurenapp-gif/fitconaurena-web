import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbDelete, sbUpsert, isMissingTable } from "@/lib/supabase";
import { safeLink, parseAgua, parsePasos, MAX_NAME, MAX_DOSE, MAX_TIMING, MAX_NOTE, MIN_AGUA, MAX_AGUA, MIN_PASOS, MAX_PASOS } from "@/lib/suplementos";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pauta de agua y suplementación de una clienta. Solo la coach.
 *
 * Tres cosas por el mismo sitio porque van juntas en la misma tarjeta de la
 * ficha: `agua` fija los litros al día, `pasos` los pasos diarios, y sin
 * ninguna de las dos se añade un suplemento.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { member?: unknown; agua?: unknown; pasos?: unknown; name?: unknown; dose?: unknown; timing?: unknown; url?: unknown; note?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const member = typeof data.member === "string" ? normalizeEmail(data.member) : "";
  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });

  // --- Objetivo de agua ----------------------------------------------------
  if (data.agua !== undefined) {
    // Cadena vacía = quitarle el objetivo.
    const vacia = typeof data.agua === "string" && data.agua.trim() === "";
    const litros = vacia ? null : parseAgua(data.agua);
    if (!vacia && litros === null) {
      return NextResponse.json({ error: `Pon los litros al día, entre ${MIN_AGUA} y ${MAX_AGUA}.` }, { status: 400 });
    }
    try {
      await sbUpsert("profiles", { email: member, water_target_l: litros, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error("[clientas/suplementos] agua", err);
      if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la columna.", setup: true }, { status: 400 });
      return NextResponse.json({ error: "No se pudo guardar el agua." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, agua: litros });
  }

  // --- Objetivo de pasos ---------------------------------------------------
  if (data.pasos !== undefined) {
    // Cadena vacía = quitarle el objetivo.
    const vacia = typeof data.pasos === "string" && data.pasos.trim() === "";
    const diarios = vacia ? null : parsePasos(data.pasos);
    if (!vacia && diarios === null) {
      return NextResponse.json({ error: `Pon los pasos al día, entre ${MIN_PASOS} y ${MAX_PASOS}.` }, { status: 400 });
    }
    try {
      await sbUpsert("profiles", { email: member, steps_target: diarios, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error("[clientas/suplementos] pasos", err);
      if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la columna.", setup: true }, { status: 400 });
      return NextResponse.json({ error: "No se pudo guardar los pasos." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pasos: diarios });
  }

  // --- Suplemento nuevo ----------------------------------------------------
  const name = typeof data.name === "string" ? data.name.trim().slice(0, MAX_NAME) : "";
  if (!name) return NextResponse.json({ error: "Pon el nombre del suplemento." }, { status: 400 });

  const dose = typeof data.dose === "string" ? data.dose.trim().slice(0, MAX_DOSE) : "";
  const timing = typeof data.timing === "string" ? data.timing.trim().slice(0, MAX_TIMING) : "";
  const note = typeof data.note === "string" ? data.note.trim().slice(0, MAX_NOTE) : "";

  // El enlace es opcional, pero si se pone algo tiene que ser un enlace de
  // verdad: guardar basura ahí solo sirve para que a la clienta no le funcione.
  const puso = typeof data.url === "string" && data.url.trim() !== "";
  const url = safeLink(data.url);
  if (puso && !url) return NextResponse.json({ error: "El enlace tiene que empezar por https://" }, { status: 400 });

  try {
    await sbInsert("member_supplements", {
      member_email: member,
      name,
      dose: dose || null,
      timing: timing || null,
      url,
      note: note || null,
      created_by: me,
    });
  } catch (err) {
    console.error("[clientas/suplementos] alta", err);
    if (isMissingTable(err)) return NextResponse.json({ error: "Falta crear la tabla.", setup: true }, { status: 400 });
    return NextResponse.json({ error: "No se pudo guardar el suplemento." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Quita un suplemento de la pauta. Solo la coach. */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { id?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Suplemento no válido." }, { status: 400 });

  try {
    await sbDelete("member_supplements", `id=eq.${id}`);
  } catch (err) {
    console.error("[clientas/suplementos] borrar", err);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
