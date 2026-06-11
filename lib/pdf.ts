/**
 * Generación del PDF de contrato FIRMADO (solo servidor, runtime nodejs).
 *
 * Toma el PDF de la plantilla y le añade al final una página de firma con: el
 * trazo dibujado por la clienta, su nombre, email, fecha/hora, IP y navegador.
 * El resultado es un único documento descargable que sirve como prueba de la
 * firma electrónica simple.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.42, 0.42, 0.42);
const BRAND = rgb(0.79, 1, 0);

export type SignedPdfInput = {
  template: ArrayBuffer;
  signaturePng: Uint8Array;
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  ip: string;
  userAgent: string;
  version: number;
};

function madridStamp(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export async function buildSignedContractPdf(opts: SignedPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(opts.template, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const png = await pdf.embedPng(opts.signaturePng);

  const page = pdf.addPage(A4);
  const { width, height } = page.getSize();
  const M = 56; // margen
  let y = height - M;

  // Encabezado de marca.
  page.drawText("fitconaurena", { x: M, y, size: 16, font: bold, color: INK });
  page.drawRectangle({ x: M, y: y - 10, width: width - M * 2, height: 2, color: BRAND });
  y -= 48;

  page.drawText("Contrato firmado electrónicamente", { x: M, y, size: 20, font: bold, color: INK });
  y -= 40;

  const row = (label: string, value: string) => {
    page.drawText(label, { x: M, y, size: 10, font, color: MUTED });
    page.drawText(value, { x: M + 130, y, size: 12, font: bold, color: INK });
    y -= 26;
  };

  row("Firmante", opts.signerName);
  row("Email", opts.signerEmail);
  row("Fecha y hora", `${madridStamp(opts.signedAt)} (hora de Madrid)`);
  row("Versión", `v${opts.version}`);
  row("IP", opts.ip || "—");

  // user-agent puede ser largo: lo recortamos para que no se salga.
  const ua = (opts.userAgent || "—").slice(0, 90);
  row("Dispositivo", ua);

  y -= 20;
  page.drawText("Firma:", { x: M, y, size: 10, font, color: MUTED });
  y -= 12;

  // Caja de firma con el trazo escalado manteniendo proporción.
  const boxW = 260;
  const boxH = 110;
  const scaled = png.scaleToFit(boxW - 16, boxH - 16);
  const boxY = y - boxH;
  page.drawRectangle({
    x: M,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });
  page.drawImage(png, {
    x: M + (boxW - scaled.width) / 2,
    y: boxY + (boxH - scaled.height) / 2,
    width: scaled.width,
    height: scaled.height,
  });
  y = boxY - 28;

  const legal =
    "Documento firmado mediante firma electrónica simple (Reglamento eIDAS UE 910/2014). " +
    "La validez de la firma queda acreditada por el registro de identidad, fecha, hora y " +
    "dirección IP recogidos en el momento de la aceptación.";
  // Texto legal en varias líneas (envoltura simple por ancho).
  const maxW = width - M * 2;
  const words = legal.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, 9) > maxW) {
      page.drawText(line, { x: M, y, size: 9, font, color: MUTED });
      y -= 14;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x: M, y, size: 9, font, color: MUTED });

  return pdf.save();
}
