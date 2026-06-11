import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, adminEmails } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbInsert, sbUpload, sbDownload, safePath } from "@/lib/supabase";
import { CONTRACT_BUCKET, type ContractTemplate } from "@/lib/contract";
import { buildSignedContractPdf } from "@/lib/pdf";
import { sendContractSignedNotice } from "@/lib/mailer";
import { sendPushToEmails } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Registra la FIRMA de la clienta sobre la plantilla vigente: guarda el trazo,
 * genera el PDF firmado (plantilla + página de firma con nombre, fecha, IP y
 * navegador) y avisa a la coach. Firma electrónica simple (eIDAS).
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (isAdmin(me)) return NextResponse.json({ error: "La coach no firma el contrato." }, { status: 400 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let body: { signerName?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const signerName = (body.signerName ?? "").trim().slice(0, 120);
  if (signerName.length < 3) return NextResponse.json({ error: "Escribe tu nombre completo." }, { status: 400 });

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.signature ?? "");
  if (!match) return NextResponse.json({ error: "Falta tu firma. Dibújala en el recuadro." }, { status: 400 });
  const sigBytes = Buffer.from(match[1], "base64");
  if (sigBytes.length < 200 || sigBytes.length > 600 * 1024)
    return NextResponse.json({ error: "La firma no es válida. Inténtalo de nuevo." }, { status: 400 });

  // Plantilla vigente.
  let tpl: ContractTemplate | undefined;
  try {
    tpl = (await sbSelect<ContractTemplate>("contract_template", "select=*&id=eq.1"))[0];
  } catch (e) {
    console.error("[contrato/firmar] template", e);
  }
  if (!tpl) return NextResponse.json({ error: "Todavía no hay contrato disponible." }, { status: 409 });

  // ¿Ya firmó esta versión?
  try {
    const existing = await sbSelect<{ id: string }>(
      "contract_signatures",
      `select=id&member_email=eq.${encodeURIComponent(me)}&version=eq.${tpl.version}`
    );
    if (existing.length) return NextResponse.json({ error: "Ya has firmado este contrato." }, { status: 409 });
  } catch (e) {
    console.error("[contrato/firmar] check", e);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "—";
  const userAgent = (req.headers.get("user-agent") ?? "—").slice(0, 300);
  const signedAt = new Date();

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
    });
    const sigPath = `firmas/${safePath(`v${tpl.version}-${me}.png`)}`;
    const pdfPath = `firmados/${safePath(`v${tpl.version}-${me}.pdf`)}`;
    await sbUpload(CONTRACT_BUCKET, sigPath, sigBytes, "image/png");
    await sbUpload(CONTRACT_BUCKET, pdfPath, signedPdf, "application/pdf");
    await sbInsert("contract_signatures", {
      member_email: me,
      version: tpl.version,
      signer_name: signerName,
      signature_path: sigPath,
      signed_pdf_path: pdfPath,
      ip,
      user_agent: userAgent,
      signed_at: signedAt.toISOString(),
    });
  } catch (err) {
    console.error("[contrato/firmar]", err);
    return NextResponse.json({ error: "No se pudo registrar tu firma. Inténtalo de nuevo." }, { status: 500 });
  }

  // Aviso a la coach (no bloqueante).
  const admins = adminEmails();
  if (admins.length) {
    sendContractSignedNotice(admins, me, signerName).catch((e) => console.error("[contrato] email", e));
    sendPushToEmails(admins, {
      title: "Contrato firmado ✍️",
      body: `${signerName} ha firmado el contrato.`,
      url: `/miembros/clientas/${encodeURIComponent(me)}`,
    }).catch((e) => console.error("[contrato] push", e));
  }

  return NextResponse.json({ ok: true });
}
