import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, adminEmails } from "@/lib/members";
import { sbInsert, sbUpdate, sbDelete, isMissingTable } from "@/lib/supabase";
import { sendDudaNotice } from "@/lib/mailer";
import { isCategory, isStatus, categoryOf } from "@/lib/dudas";
import { voterHash } from "@/lib/dudasVoto";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY = 2000;
const MAX_ANSWER = 4000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo http(s): un enlace con esquema raro (javascript:, data:…) acabaría
 * renderizado como enlace en el área de las clientas. */
function safeLink(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Deja una duda en el buzón.
 *
 * ANONIMATO: no se guarda el correo, ni la IP, ni el navegador, y la fecha es
 * solo el día (lo pone la base de datos por defecto). Lo único que identifica
 * a alguien es `reply_email`, y solo si ha pedido respuesta privada.
 *
 * El límite por persona se calcula sobre el hash del correo, que no se guarda
 * en ningún sitio: sirve para frenar el spam sin romper el anonimato.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  // 5 dudas por hora y persona: de sobra para el uso normal.
  if (!rateLimit(`duda:${voterHash(me)}`, 5, 3600_000)) {
    return NextResponse.json({ error: "Has enviado varias dudas seguidas. Prueba dentro de un rato." }, { status: 429 });
  }

  let data: { categoria?: unknown; body?: unknown; privada?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const body = typeof data.body === "string" ? data.body.trim().slice(0, MAX_BODY) : "";
  if (body.length < 10) {
    return NextResponse.json({ error: "Cuéntame un poco más para poder ayudarte bien." }, { status: 400 });
  }
  const categoria = isCategory(data.categoria) ? (data.categoria as string) : "otras";
  const privada = data.privada === true;

  try {
    await sbInsert("dudas", {
      categoria,
      body,
      // Si pide respuesta privada, deja de ser anónima y deja de ser pública:
      // es una consulta directa a la coach.
      reply_email: privada ? me : null,
    });
  } catch (err) {
    console.error("[dudas] insert", err);
    if (isMissingTable(err)) {
      return NextResponse.json({ error: "Falta crear la tabla de dudas en la base de datos.", setup: true }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo enviar tu duda." }, { status: 500 });
  }

  // Aviso a la coach. Nunca bloquea: la duda ya está guardada.
  sendDudaNotice(adminEmails(), categoryOf(categoria).label.toLowerCase(), privada)
    .catch((e) => console.error("[dudas] aviso", e));

  return NextResponse.json({ ok: true, privada });
}

/** Responde, clasifica u oculta una duda. Solo la coach. */
export async function PATCH(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let data: { id?: unknown; answer?: unknown; answer_url?: unknown; status?: unknown; hidden?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Duda no válida." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (data.answer !== undefined) {
    const answer = typeof data.answer === "string" ? data.answer.trim().slice(0, MAX_ANSWER) : "";
    patch.answer = answer || null;
  }
  if (data.answer_url !== undefined) {
    const url = safeLink(data.answer_url);
    // Distinguir "lo he borrado" de "he pegado algo que no es un enlace".
    if (!url && typeof data.answer_url === "string" && data.answer_url.trim()) {
      return NextResponse.json({ error: "El enlace debe empezar por https://" }, { status: 400 });
    }
    patch.answer_url = url;
  }
  if (data.status !== undefined) {
    if (!isStatus(data.status)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    patch.status = data.status;
  }
  if (data.hidden !== undefined) patch.hidden = data.hidden === true;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que guardar." }, { status: 400 });
  }

  // Marca de cuándo se respondió, para que la clienta vea que es reciente.
  if (patch.answer || patch.answer_url) patch.answered_at = new Date().toISOString();

  // Si escribe una respuesta y no toca el estado, la duda pasa a resuelta sola:
  // es lo que espera después de contestar.
  if ((patch.answer || patch.answer_url) && data.status === undefined) patch.status = "resuelta";

  try {
    await sbUpdate("dudas", `id=eq.${id}`, patch);
  } catch (err) {
    console.error("[dudas] patch", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Borra una duda. Solo la coach. */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Duda no válida." }, { status: 400 });

  try {
    await sbDelete("dudas", `id=eq.${id}`);
  } catch (err) {
    console.error("[dudas] delete", err);
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
