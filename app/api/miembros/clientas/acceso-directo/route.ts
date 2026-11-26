import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbUpsert } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Dejar entrar a alguien SIN pasar por nada: ni bienvenida, ni contrato, ni
 * espera.
 *
 * PARA QUÉ. Invitadas, pruebas, alguien a quien se le enseña el programa por
 * dentro. Gente que no viene a contratar y a la que pedirle nombre completo,
 * dirección y código postal en la puerta no tiene sentido.
 *
 * LO QUE ESTO SE SALTA, Y CONVIENE SABERLO. La bienvenida no es un trámite
 * decorativo: ahí es donde acepta las condiciones con una casilla sin
 * premarcar, y donde deja los datos que el contrato necesita. Quien entre por
 * aquí entra SIN haberlas aceptado. Para una invitada da igual; para una
 * clienta de verdad, no: a esa se la da de alta por el camino normal.
 *
 * Solo la coach. Y es reversible: se quita desde su ficha.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; directo?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  const directo = body.directo !== false;

  // Tiene que existir ya: esto abre puertas, no da de alta. Si no está en la
  // plataforma, el enlace de acceso no le llegaría igualmente.
  try {
    const hay = await sbSelect<{ email: string }>("profiles", `select=email&email=eq.${encodeURIComponent(email)}&limit=1`);
    if (hay.length === 0) {
      return NextResponse.json({ error: "Dala de alta primero; esto solo le quita los pasos de entrada." }, { status: 404 });
    }
  } catch (err) {
    console.error("[acceso-directo] buscar", err);
    return NextResponse.json({ error: "No se pudo comprobar." }, { status: 500 });
  }

  /*
   * Al quitarlo NO se borra la fecha de bienvenida si ya la había pasado de
   * verdad: eso la obligaría a repetirla sin motivo. Solo se deshace la
   * exención de contrato, que es lo que de verdad se concedió.
   */
  const campos = directo
    ? { email, onboarding_completed_at: new Date().toISOString(), contracts_exempt: true, access_revoked: false, access_from: null, updated_at: new Date().toISOString() }
    : { email, contracts_exempt: false, updated_at: new Date().toISOString() };

  try {
    await sbUpsert("profiles", campos);
  } catch (err) {
    console.error("[acceso-directo] guardar", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  console.log(`[acceso-directo] ${directo ? "concedido" : "retirado"} a ${email} por ${me}`);
  return NextResponse.json({ ok: true, directo });
}
