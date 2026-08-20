import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, createMagicToken } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sendWelcomeEmail } from "@/lib/mailer";
import { sbUpsert, sbSelect, sbInsertIgnore } from "@/lib/supabase";
import { nuevoVencimiento } from "@/lib/profile";
import type { ContractTemplate } from "@/lib/contract";
import { siteOrigin } from "@/lib/routeUtils";

export const runtime = "nodejs";
// Margen para los reintentos del correo de acceso: en el peor caso (Resend sin
// responder) son 3 intentos de 12 s más las esperas, unos 39 s. Sin este margen
// la función se cortaría antes y el alta quedaría a medias.
export const maxDuration = 60;
const WELCOME_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; name?: unknown; templateId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_MEMBERS_GROUP_ID;
  if (!apiKey || !groupId) return NextResponse.json({ error: "Config incompleta." }, { status: 500 });

  // 1) Alta como miembro activa en MailerLite (consentimiento: la coach la da de alta).
  try {
    const fields: Record<string, string> = {};
    if (name) fields.name = name;
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, status: "active", groups: [groupId], ...(name ? { fields } : {}) }),
    });
    if (!res.ok) {
      console.error("[alta] mailerlite", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "No se pudo dar de alta en MailerLite." }, { status: 502 });
    }
  } catch (err) {
    console.error("[alta] mailerlite", err);
    return NextResponse.json({ error: "No se pudo dar de alta." }, { status: 502 });
  }

  // Reactiva el acceso por si estaba revocada de antes.
  //
  // `contracts_exempt: false` solo se fuerza cuando la coach ha elegido contrato:
  // así una clienta ANTIGUA a la que se vuelva a dar de alta sin contrato sigue
  // exenta (no se le exige firmar nada), mientras que si se le asigna contrato
  // pasa a estar obligada, igual que una nueva.
  // VENCIMIENTO DEL SERVICIO: doce meses desde hoy, puesto solo. La decisión
  // de si toca fecha nueva o se respeta la que ya tiene vive en
  // `nuevoVencimiento` (ver allí el porqué).
  let serviceEnd: string | null = null;
  try {
    const prev = (await sbSelect<{ service_ends_at: string | null }>(
      "profiles",
      `select=service_ends_at&email=eq.${encodeURIComponent(email)}`
    ))[0];
    serviceEnd = nuevoVencimiento(prev?.service_ends_at);
  } catch {
    // La columna aún no existe (falta la migración): seguimos sin ella, que el
    // alta no se caiga por esto.
  }

  const base = {
    email,
    ...(name ? { display_name: name } : {}),
    access_revoked: false,
    updated_at: new Date().toISOString(),
  };
  const conVencimiento = serviceEnd ? { ...base, service_ends_at: serviceEnd } : base;
  await sbUpsert("profiles", templateId ? { ...conVencimiento, contracts_exempt: false } : conVencimiento)
    // Si alguna columna todavía no existe, guardamos al menos lo básico.
    .catch(() => sbUpsert("profiles", base).catch(() => {}));

  // Los avisos se acumulan y se devuelven al final. NUNCA se sale antes de
  // enviar el correo de acceso: sin ese correo la clienta no puede entrar, así
  // que es lo último que debe fallar y lo único imprescindible de este alta.
  const avisos: string[] = [];

  // Contrato elegido en el alta + anexo de salud, listos para firmar al entrar.
  if (templateId) {
    try {
      const now = new Date().toISOString();
      // on_conflict con las columnas del índice: si ya tenía ese contrato
      // asignado (por ejemplo al repetir el alta) no da error, simplemente no
      // hace nada.
      const assign = (id: string) => sbInsertIgnore("contract_assignments", {
        member_email: email, template_id: id, status: "pendiente", assigned_by: me, assigned_at: now,
      }, "member_email,template_id");
      await assign(templateId);
      const anexo = (await sbSelect<ContractTemplate>(
        "contract_templates",
        "select=id&kind=eq.anexo_salud&active=is.true&order=created_at.desc&limit=1"
      ).catch(() => []))[0];
      if (anexo) await assign(anexo.id);
    } catch (err) {
      console.error("[alta] asignar contrato", err);
      avisos.push("no se pudo asignar el contrato (asígnalo desde su ficha)");
    }
  }

  // 2) Email de bienvenida con acceso directo (enlace válido 7 días).
  let emailEnviado = false;
  try {
    const token = createMagicToken(email, WELCOME_TTL);
    const url = `${siteOrigin(req)}/api/miembros/verificar?token=${encodeURIComponent(token)}`;
    await sendWelcomeEmail(email, url);
    emailEnviado = true;
  } catch (err) {
    console.error("[alta] welcome email", err);
    avisos.push("el email de acceso NO se ha enviado, vuelve a intentarlo");
  }

  return NextResponse.json({
    ok: true,
    email,
    emailEnviado,
    ...(avisos.length ? { warning: `Alta hecha, pero ${avisos.join("; ")}.` } : {}),
  });
}
