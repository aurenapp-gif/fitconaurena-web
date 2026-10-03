import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, createMagicToken } from "@/lib/members";
import { sendAccesoEquipo } from "@/lib/mailer";
import { siteOrigin } from "@/lib/routeUtils";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbUpsert, sbDelete, isMissingTable } from "@/lib/supabase";
import { olvidarEquipo, SETUP_SQL } from "@/lib/equipo";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Lo que dura el enlace del correo de acceso. */
const ACCESO_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

/**
 * Dar de alta y de baja al equipo. SOLO el CEO.
 *
 * Esto reparte permisos, así que no se abre a nadie más: si el equipo pudiera
 * tocar esta lista, cualquiera del equipo podría meterse a sí mismo donde no
 * le toca, o meter a un tercero.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; nombre?: unknown; puesto?: unknown; activo?: unknown; enviarAcceso?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  // El CEO no se añade a sí mismo al equipo: ya lo puede todo, y meterlo aquí
  // solo confundiría quién es quién.
  if (isAdmin(email)) return NextResponse.json({ error: "Ese correo ya es el tuyo." }, { status: 400 });

  const fila = {
    email,
    nombre: typeof body.nombre === "string" ? body.nombre.trim().slice(0, 80) || null : null,
    puesto: typeof body.puesto === "string" ? body.puesto.trim().slice(0, 40) || null : null,
    activo: body.activo === false ? false : true,
    created_by: me,
  };

  try {
    await sbUpsert("staff", fila, "email");
    olvidarEquipo();
  } catch (err) {
    console.error("[equipo] alta", err);
    if (isMissingTable(err)) {
      return NextResponse.json({ error: `Falta crear la tabla. Ejecuta en Supabase:\n\n${SETUP_SQL}` }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  // Y se le manda su acceso. Sin esto, darle de alta no se entera nadie: era
  // justo lo que pasaba antes —el entrenador quedaba dado de alta y esperando
  // un correo que no existía—.
  let enviado = false;
  if (body.enviarAcceso !== false) {
    try {
      const token = createMagicToken(email, ACCESO_TTL);
      await sendAccesoEquipo(email, fila.nombre, `${siteOrigin(req)}/api/miembros/verificar?token=${token}`);
      enviado = true;
    } catch (err) {
      // El alta ya está hecha: se avisa, pero no se deshace. Siempre se le
      // puede reenviar el acceso desde la misma pantalla.
      console.error("[equipo] correo de acceso", err);
    }
  }

  return NextResponse.json({ ok: true, email, enviado });
}

/** Quita a alguien del equipo. `?email=…`. Solo el CEO. */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const email = normalizeEmail(req.nextUrl.searchParams.get("email") ?? "");
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });

  try {
    await sbDelete("staff", `email=eq.${encodeURIComponent(email)}`);
    olvidarEquipo();
  } catch (err) {
    console.error("[equipo] baja", err);
    return NextResponse.json({ error: "No se pudo quitar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
