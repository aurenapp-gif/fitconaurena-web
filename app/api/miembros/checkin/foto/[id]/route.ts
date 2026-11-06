import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { sbSelect, sbSignedUrl, sbSignedThumb } from "@/lib/supabase";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

/** Qué foto de la revisión. El nombre de fuera no es el de la columna. */
const COLUMNA = {
  frente: "photo_front",
  perfil: "photo_side",
  espaldas: "photo_back",
  unica: "photo_path",
} as const;
type Cual = keyof typeof COLUMNA;

/**
 * Abrir una foto de revisión por su identificador, no por un enlace firmado.
 *
 * POR QUÉ. El enlace firmado de Supabase caduca en una hora, y estas fotos no
 * se piden al pintar la pantalla: las miniaturas llevan `loading="lazy"` y se
 * piden al llegar con el scroll, y la foto grande solo se pide al tocarla.
 * Una pantalla de revisiones abierta un rato se quedaba en blanco al bajar, y
 * al tocar una miniatura no salía nada.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.redirect(`${siteOrigin(req)}/miembros/acceso`);

  const id = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Revisión no válida." }, { status: 400 });
  }
  const cual = req.nextUrl.searchParams.get("cual") ?? "";
  if (!(cual in COLUMNA)) return NextResponse.json({ error: "Foto no válida." }, { status: 400 });

  type Fila = { member_email: string } & Partial<Record<(typeof COLUMNA)[Cual], string | null>>;
  let fila: Fila | undefined;
  try {
    const cols = Object.values(COLUMNA).join(",");
    fila = (await sbSelect<Fila>("check_ins", `select=member_email,${cols}&id=eq.${id}`))[0];
  } catch (e) {
    console.error("[checkin/foto] leer", e);
    return NextResponse.json({ error: "No se ha podido abrir la foto." }, { status: 502 });
  }
  if (!fila) return NextResponse.json({ error: "Esa revisión ya no está." }, { status: 404 });

  // Suya, o de alguien que trabaja con ella. Nunca la de otra clienta.
  if (fila.member_email.toLowerCase() !== me.toLowerCase() && !(await puedeGestionarClientas(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const ruta = fila[COLUMNA[cual as Cual]] ?? null;
  if (!ruta) return NextResponse.json({ error: "Esa foto ya no está." }, { status: 404 });

  // `w` pide la miniatura. Si la transformación no está disponible se cae a la
  // foto entera, igual que hacía la pantalla.
  const w = Number(req.nextUrl.searchParams.get("w") ?? "");
  try {
    const url = w > 0
      ? await sbSignedThumb("checkins", ruta, w).catch(() => sbSignedUrl("checkins", ruta, 3600))
      : await sbSignedUrl("checkins", ruta, 3600);
    /*
     * Que el navegador no vuelva a pedir la misma foto durante media hora: la
     * firma dura una, y sin esto cada vuelta a la pantalla de revisiones
     * dispara otra tanda de firmas a la vez.
     */
    const r = NextResponse.redirect(url);
    r.headers.set("Cache-Control", "private, max-age=1800");
    return r;
  } catch (e) {
    console.error("[checkin/foto] firmar", e);
    return NextResponse.json({ error: "No se ha podido abrir la foto." }, { status: 502 });
  }
}
