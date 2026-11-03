import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { CONTRACT_BUCKET } from "@/lib/contract";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";

/**
 * Abrir un contrato ya firmado por su identificador, no por un enlace firmado.
 *
 * POR QUÉ. El enlace firmado de Supabase caduca en una hora. Su contrato vive
 * en el perfil, que es una pantalla que se deja abierta: al volver a ella y
 * pulsar «Ver», el enlace que llevaba la página ya estaba muerto. Un contrato
 * es justo el papel que se busca meses después.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.redirect(`${siteOrigin(req)}/miembros/acceso`);

  const id = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Contrato no válido." }, { status: 400 });
  }

  type Fila = { member_email: string; signed_pdf_path: string | null };
  let fila: Fila | undefined;
  try {
    const filas = await sbSelect<Fila>(
      "contract_signatures", `select=member_email,signed_pdf_path&id=eq.${id}`
    );
    fila = filas[0];
  } catch (e) {
    console.error("[contrato] leer", e);
    return NextResponse.json({ error: "No se ha podido abrir el contrato." }, { status: 502 });
  }
  if (!fila?.signed_pdf_path) return NextResponse.json({ error: "Ese contrato ya no está." }, { status: 404 });

  // Suyo, o de alguien que trabaja con ella. Nunca el de otra clienta.
  if (fila.member_email.toLowerCase() !== me.toLowerCase() && !(await puedeGestionarClientas(me))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const descarga = req.nextUrl.searchParams.has("download");
  try {
    const url = await sbSignedUrl(CONTRACT_BUCKET, fila.signed_pdf_path, 3600);
    return NextResponse.redirect(descarga ? `${url}${url.includes("?") ? "&" : "?"}download` : url);
  } catch (e) {
    console.error("[contrato] firmar", e);
    return NextResponse.json({ error: "No se ha podido abrir el contrato." }, { status: 502 });
  }
}
