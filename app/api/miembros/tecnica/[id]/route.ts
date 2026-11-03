import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

/**
 * Abrir el vídeo de una corrección, o la respuesta de la coach, por su
 * identificador y no por un enlace firmado.
 *
 * POR QUÉ. El enlace firmado de Supabase caduca en una hora, y el navegador
 * no pide el archivo al pintar la pantalla: lo pide al dar al play. La nota
 * de voz lleva `preload="none"` y el vídeo `preload="metadata"`, así que una
 * pantalla abierta un rato y el play pulsado después se encontraba el enlace
 * muerto: la corrección que le dejó su coach no sonaba, sin decir por qué.
 *
 * Esta dirección no caduca. Al pulsarla se comprueba la sesión, se firma en
 * ese momento y se redirige.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.redirect(`${siteOrigin(req)}/miembros/acceso`);

  const id = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Grabación no válida." }, { status: 400 });
  }

  type Fila = { member_email: string; video_path: string | null; coach_reply_path: string | null };
  let fila: Fila | undefined;
  try {
    const filas = await sbSelect<Fila>(
      "technique_reviews", `select=member_email,video_path,coach_reply_path&id=eq.${id}`
    );
    fila = filas[0];
  } catch (e) {
    console.error("[tecnica] leer", e);
    return NextResponse.json({ error: "No se ha podido abrir." }, { status: 502 });
  }
  if (!fila) return NextResponse.json({ error: "Esa grabación ya no está." }, { status: 404 });

  // Suya, o de alguien que trabaja con ella. Nunca la de otra clienta.
  if (fila.member_email.toLowerCase() !== me.toLowerCase() && !(await puedeGestionarClientas(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const ruta = req.nextUrl.searchParams.get("de") === "respuesta" ? fila.coach_reply_path : fila.video_path;
  if (!ruta) return NextResponse.json({ error: "Esa grabación ya no está." }, { status: 404 });

  try {
    return NextResponse.redirect(await sbSignedUrl("tecnica", ruta, 3600));
  } catch (e) {
    console.error("[tecnica] firmar", e);
    return NextResponse.json({ error: "No se ha podido abrir." }, { status: 502 });
  }
}
