import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

/**
 * Abrir un plan por su identificador, no por un enlace firmado.
 *
 * POR QUÉ. El enlace firmado de Supabase caduca en una hora. La app se instala
 * en el móvil y la pantalla se queda abierta días: cuando la clienta volvía a
 * ella y pulsaba «Abrir mi plan», el enlace que llevaba la página ya estaba
 * muerto y Supabase contestaba con un error que, desde su lado, era «no me
 * deja ver mi planificación».
 *
 * Esta dirección no caduca nunca. Al pulsarla se comprueba la sesión, se firma
 * el enlace en ese momento y se redirige. Si la sesión ha caducado, lleva a la
 * pantalla de acceso en vez de a un error de Supabase que no dice nada.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.redirect(`${siteOrigin(req)}/miembros/acceso`);

  const id = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Plan no válido." }, { status: 400 });
  }

  let plan: { member_email: string; file_path: string | null; type: string; title: string | null } | undefined;
  try {
    const filas = await sbSelect<{ member_email: string; file_path: string | null; type: string; title: string | null }>(
      "plans", `select=member_email,file_path,type,title&id=eq.${id}`
    );
    plan = filas[0];
  } catch (e) {
    console.error("[plan] leer", e);
    return NextResponse.json({ error: "No se pudo abrir el plan." }, { status: 502 });
  }
  if (!plan?.file_path) return NextResponse.json({ error: "Ese plan ya no está." }, { status: 404 });

  // Suyo, o de alguien que trabaja con ella. Nunca el de otra clienta.
  const suyo = plan.member_email.toLowerCase() === me.toLowerCase();
  if (!suyo && !(await puedeGestionarClientas(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const descarga = req.nextUrl.searchParams.has("download");
  let url: string;
  try {
    url = await sbSignedUrl("planes", plan.file_path, 3600);
  } catch (e) {
    console.error("[plan] firmar", e);
    return NextResponse.json({ error: "No se pudo abrir el plan." }, { status: 502 });
  }

  // El registro de uso solo tiene sentido cuando lo abre ella.
  if (suyo) {
    const etiqueta = plan.type === "nutricion" ? "Plan de alimentación" : "Plan de entrenamiento";
    logActivity(me, descarga ? "plan_descargado" : "plan_abierto", plan.title?.trim() || etiqueta).catch(() => {});
  }

  return NextResponse.redirect(descarga ? `${url}${url.includes("?") ? "&" : "?"}download` : url);
}
