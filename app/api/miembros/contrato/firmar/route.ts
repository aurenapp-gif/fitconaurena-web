import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, adminEmails } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbInsert, sbUpload, sbDownload, sbUpdate, sbUpsert, safePath } from "@/lib/supabase";
import {
  CONTRACT_BUCKET,
  DIAS_DESISTIMIENTO,
  OPCION_DIFERIDO,
  OPCION_INMEDIATO,
  fieldsFor,
  validateFields,
  type ContractTemplate,
  type ContractAssignment,
} from "@/lib/contract";
import { buildSignedContractPdf } from "@/lib/pdf";
import { sendContractSignedNotice } from "@/lib/mailer";
import { sendPushToEmails } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Firma una asignación concreta de contrato. Recibe:
 *   - assignmentId (o templateId directo, para compatibilidad)
 *   - signerName
 *   - signature (data:image/png;base64,...)
 *   - fieldValues (objeto con los campos del formulario)
 *
 * Guarda la firma con IP + user-agent + hora, marca la asignación como firmada
 * y genera un PDF que incluye los campos rellenados y la firma manuscrita.
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (isAdmin(me)) return NextResponse.json({ error: "La coach no firma el contrato." }, { status: 400 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { assignmentId?: string; templateId?: string; signerName?: string; signature?: string; fieldValues?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const signerName = (body.signerName ?? "").trim().slice(0, 120);
  if (signerName.length < 3) return NextResponse.json({ error: "Escribe tu nombre completo." }, { status: 400 });

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.signature ?? "");
  if (!match) return NextResponse.json({ error: "Falta tu firma. Dibújala en el recuadro." }, { status: 400 });
  const sigBytes = Buffer.from(match[1], "base64");
  if (sigBytes.length < 200 || sigBytes.length > 600 * 1024)
    return NextResponse.json({ error: "La firma no es válida. Inténtalo de nuevo." }, { status: 400 });

  // Resolver asignación + plantilla. Se admiten dos rutas:
  //  a) assignmentId → consulta directa (ruta principal desde /miembros/contrato)
  //  b) templateId sin asignación previa → solo si esa plantilla está activa y
  //     asignada realmente a esta clienta (fallback defensivo).
  let assignment: ContractAssignment | undefined;
  let tpl: ContractTemplate | undefined;
  try {
    if (body.assignmentId) {
      const rows = await sbSelect<ContractAssignment>(
        "contract_assignments",
        `select=*&id=eq.${encodeURIComponent(body.assignmentId)}&member_email=eq.${encodeURIComponent(me)}&limit=1`
      );
      assignment = rows[0];
    }
    if (!assignment && body.templateId) {
      const rows = await sbSelect<ContractAssignment>(
        "contract_assignments",
        `select=*&template_id=eq.${encodeURIComponent(body.templateId)}&member_email=eq.${encodeURIComponent(me)}&limit=1`
      );
      assignment = rows[0];
    }
    if (!assignment) return NextResponse.json({ error: "No tienes ese contrato asignado." }, { status: 404 });
    if (assignment.status === "firmado") return NextResponse.json({ error: "Ya has firmado este contrato." }, { status: 409 });

    const tplRows = await sbSelect<ContractTemplate>(
      "contract_templates",
      `select=*&id=eq.${encodeURIComponent(assignment.template_id)}&limit=1`
    );
    tpl = tplRows[0];
    if (!tpl) return NextResponse.json({ error: "La plantilla del contrato ya no existe." }, { status: 409 });
  } catch (e) {
    console.error("[contrato/firmar] resolve", e);
    return NextResponse.json({ error: "No se pudo cargar el contrato." }, { status: 500 });
  }

  // Validar campos según el tipo (contrato / anexo_salud).
  const values = (body.fieldValues && typeof body.fieldValues === "object") ? body.fieldValues : {};
  const err = validateFields(tpl.kind, values);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "—";
  const userAgent = (req.headers.get("user-agent") ?? "—").slice(0, 300);
  const signedAt = new Date();

  // ANEXO II-A. La elección solo existe en el contrato, no en el anexo de salud.
  //
  // FAIL-CLOSED: si el contrato no trae elección válida, se difiere. Dar acceso
  // sin petición expresa de inicio inmediato es entregar contenido digital sin
  // que se haya pedido, y entonces se le debe el 100 % del importe. Ante la
  // duda, esperar cuesta catorce días; equivocarse cuesta el contrato entero.
  const esContrato = tpl.kind !== "anexo_salud";
  const eleccion = esContrato ? String(values.inicio_servicio ?? "") : "";
  const inmediato = eleccion === OPCION_INMEDIATO && values.reconoce_perdida === true;
  const serviceStart = new Date(signedAt);
  if (esContrato && !inmediato) serviceStart.setDate(serviceStart.getDate() + DIAS_DESISTIMIENTO);
  const soloDia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);

  try {
    const template = await sbDownload(CONTRACT_BUCKET, tpl.file_path);
    const signedPdf = await buildSignedContractPdf({
      template,
      signaturePng: new Uint8Array(sigBytes),
      signerName,
      signerEmail: me,
      signedAt,
      ip,
      userAgent,
      version: tpl.version,
      kind: tpl.kind,
      title: tpl.title,
      fields: fieldsFor(tpl.kind),
      fieldValues: values,
      serviceStart,
    });
    const sigPath = `firmas/${safePath(`${tpl.kind}-${me}.png`)}`;
    const pdfPath = `firmados/${safePath(`${tpl.kind}-${me}.pdf`)}`;
    await sbUpload(CONTRACT_BUCKET, sigPath, sigBytes, "image/png");
    await sbUpload(CONTRACT_BUCKET, pdfPath, signedPdf, "application/pdf");
    await sbInsert("contract_signatures", {
      member_email: me,
      version: tpl.version,
      template_id: tpl.id,
      assignment_id: assignment.id,
      signer_name: signerName,
      signature_path: sigPath,
      signed_pdf_path: pdfPath,
      field_values: values,
      ip,
      user_agent: userAgent,
      signed_at: signedAt.toISOString(),
      ...(esContrato ? {
        inicio_servicio: inmediato ? OPCION_INMEDIATO : OPCION_DIFERIDO,
        reconoce_perdida: values.reconoce_perdida === true,
        condicion_cliente: typeof values.condicion_cliente === "string" ? values.condicion_cliente : null,
        nif_empresa: typeof values.nif_empresa === "string" ? values.nif_empresa.slice(0, 40) : null,
        service_start: soloDia(serviceStart),
      } : {}),
    });
    await sbUpdate("contract_assignments", `id=eq.${encodeURIComponent(assignment.id)}`, {
      status: "firmado",
      signed_at: signedAt.toISOString(),
    });

    // Si eligió esperar, se le cierra el acceso hasta el día que toca. El cron
    // le abre la puerta y le avisa cuando llega la fecha.
    if (esContrato && !inmediato) {
      await sbUpsert("profiles", {
        email: me,
        access_from: soloDia(serviceStart),
        updated_at: signedAt.toISOString(),
      }).catch((e) => console.error("[contrato/firmar] access_from", e));
    }
  } catch (err) {
    console.error("[contrato/firmar]", err);
    return NextResponse.json({ error: "No se pudo registrar tu firma. Inténtalo de nuevo." }, { status: 500 });
  }

  // Aviso a la coach (no bloqueante).
  const admins = adminEmails();
  if (admins.length) {
    sendContractSignedNotice(admins, me, signerName).catch((e) => console.error("[contrato] email", e));
    sendPushToEmails(admins, {
      title: `${tpl.kind === "anexo_salud" ? "Anexo de salud firmado" : "Contrato firmado"} ✍️`,
      body: `${signerName} ha firmado ${tpl.title}.`,
      url: `/miembros/clientas/${encodeURIComponent(me)}`,
    }).catch((e) => console.error("[contrato] push", e));
  }

  return NextResponse.json({ ok: true });
}
