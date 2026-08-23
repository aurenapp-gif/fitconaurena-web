/**
 * Generación del PDF de contrato FIRMADO (solo servidor, runtime nodejs).
 *
 * Si la plantilla trae CAMPOS DE FORMULARIO (AcroForm) con los nombres que usa
 * la app, los datos de la clienta se escriben DENTRO del propio documento (en
 * los huecos de «Nombre y apellidos», «Documento de identidad», las casillas
 * SÍ/NO del cribado de salud…) y el formulario se aplana para que queden fijos
 * y nadie pueda modificarlos.
 *
 * Si la plantilla no trae campos (por ejemplo, un PDF subido a mano), se
 * mantiene el comportamiento anterior: se añade una página con los datos
 * rellenados, para no perder esa información.
 *
 * En ambos casos se añade al final una página de FIRMA con el trazo dibujado,
 * nombre, email, fecha/hora, IP y navegador (evidencia eIDAS de firma
 * electrónica simple).
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import {
  OPCION_INMEDIATO,
  OPCION_DIFERIDO,
  DIAS_DESISTIMIENTO,
  type ContractField,
  type ContractKind,
} from "@/lib/contract";

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
  kind: ContractKind;
  title: string;
  fields: ContractField[];
  fieldValues: Record<string, unknown>;
  /** Día en que arranca el servicio. Con inicio inmediato es hoy; con el
   *  diferido, catorce días después. Sirve para el Anexo III (fecha de inicio y
   *  día de cargo). */
  serviceStart?: Date;
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

/** Convierte un valor de campo en algo legible en el PDF. */
function display(field: ContractField, value: unknown): string {
  if (field.type === "checkbox") return value === true ? "Aceptado" : "No aceptado";
  if (field.type === "yesno") {
    const v = String(value ?? "").toLowerCase();
    if (v === "si") return "SÍ";
    if (v === "no") return "NO";
    return "—";
  }
  if (field.type === "date") {
    const raw = String(value ?? "");
    if (!raw) return "—";
    // ISO YYYY-MM-DD → dd/mm/aaaa
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
  }
  const s = String(value ?? "").trim();
  return s.length ? s : "—";
}

/** Escribe texto envuelto por anchura, avanzando `y`. Devuelve el nuevo `y`. */
function drawWrapped(page: PDFPage, text: string, opts: { x: number; y: number; maxW: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; lineHeight?: number }): number {
  const { x, maxW, size, font, color } = opts;
  const lh = opts.lineHeight ?? size + 4;
  let y = opts.y;
  const paragraphs = String(text).split(/\n/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        page.drawText(line, { x, y, size, font, color });
        y -= lh;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x, y, size, font, color });
      y -= lh;
    }
  }
  return y;
}

/** Texto plano de un valor, para escribirlo en un campo del PDF. */
function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** dd/mm/aaaa a partir de un ISO yyyy-mm-dd (o el valor tal cual si no lo es). */
function dmy(v: unknown): string {
  const raw = asText(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
}

/**
 * Escribe los datos de la clienta en los campos de formulario de la plantilla.
 * Devuelve cuántos campos se han rellenado: 0 significa que la plantilla no
 * tiene formulario y hay que recurrir a la página de datos.
 */
async function fillTemplateForm(pdf: PDFDocument, opts: SignedPdfInput): Promise<number> {
  const form = pdf.getForm();
  const names = new Set(form.getFields().map((f) => f.getName()));
  if (names.size === 0) return 0;

  const v = opts.fieldValues;
  const texts: Record<string, string> = {};
  const checks: string[] = [];

  if (opts.kind === "anexo_salud") {
    texts.nombre_completo = asText(v.nombre_completo) || opts.signerName;
    texts.fecha_nacimiento = dmy(v.fecha_nacimiento);
    texts.emergencia = [asText(v.emergencia_nombre), asText(v.emergencia_telefono)]
      .filter(Boolean).join(" · ");
    texts.detalle_afirmativas = asText(v.detalle_afirmativas);
    texts.fecha = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(opts.signedAt);

    // Cribado: una casilla por respuesta (SÍ / NO).
    for (const f of opts.fields) {
      if (f.type === "yesno") {
        const ans = asText(v[f.key]).toLowerCase();
        if (ans === "si" || ans === "no") checks.push(`${f.key}_${ans}`);
      } else if (f.type === "checkbox" && v[f.key] === true) {
        checks.push(f.key);
      }
    }
  } else {
    texts.nombre_completo = asText(v.nombre_completo) || opts.signerName;
    texts.dni = asText(v.dni);
    // El domicilio del contrato es una sola línea: calle, CP y ciudad juntos.
    const cp = [asText(v.codigo_postal), asText(v.ciudad)].filter(Boolean).join(" ");
    texts.domicilio = [asText(v.domicilio), cp].filter(Boolean).join(", ");
    texts.pais = asText(v.pais);
    texts.email = opts.signerEmail;
    texts.telefono = asText(v.telefono);
    texts.fecha_nacimiento = dmy(v.fecha_nacimiento);
    const dia = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric",
    }).format(opts.signedAt);
    texts.lugar_fecha = [asText(v.ciudad), dia].filter(Boolean).join(", ");

    // ---- ANEXO II-A: la elección sobre el inicio del servicio ----
    // Esto es lo que faltaba. Sin estas casillas marcadas, el contrato no
    // acredita ni la petición expresa de inicio inmediato ni el reconocimiento
    // de pérdida del derecho, y la clienta conserva los 14 días completos.
    const eleccion = asText(v.inicio_servicio);
    if (eleccion === OPCION_INMEDIATO) checks.push("inicio_opcion1");
    if (eleccion === OPCION_DIFERIDO) checks.push("inicio_opcion2");
    // Solo con inicio inmediato: con el diferido no hay nada que reconocer.
    if (eleccion === OPCION_INMEDIATO && v.reconoce_perdida === true) checks.push("reconoce_perdida");

    // Fecha y firma de los tres anexos que la piden.
    const dmyHoy = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(opts.signedAt);
    for (const p of ["anexo1", "anexo2", "anexo3b", "anexo4"]) {
      texts[`${p}_firma`] = texts.nombre_completo;
      texts[`${p}_fecha`] = dmyHoy;
    }
    // La clienta rellena el Anexo I en la misma sesión, así que consta recibido.
    checks.push("anexo1_recibido");

    // Datos del servicio que se calculan solos (Anexo III).
    if (opts.serviceStart) {
      texts.fecha_inicio = new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric",
      }).format(opts.serviceStart);
      texts.dia_cargo = String(
        Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" })
          .format(opts.serviceStart).slice(8, 10))
      );
    }
  }

  let filled = 0;
  for (const [key, value] of Object.entries(texts)) {
    if (!value || !names.has(key)) continue;
    try { form.getTextField(key).setText(value); filled++; } catch { /* campo de otro tipo */ }
  }
  for (const key of checks) {
    if (!names.has(key)) continue;
    try { form.getCheckBox(key).check(); filled++; } catch { /* campo de otro tipo */ }
  }
  if (filled === 0) return 0;

  // Aplanar deja los valores incrustados como contenido fijo: ya no son
  // campos editables, así que el documento firmado no se puede alterar.
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helv);
  form.flatten();
  return filled;
}

export async function buildSignedContractPdf(opts: SignedPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(opts.template, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const png = await pdf.embedPng(opts.signaturePng);

  const M = 56;
  const contentW = A4[0] - M * 2;

  // Datos DENTRO del documento, si la plantilla trae campos de formulario.
  let filledInPlace = 0;
  try {
    filledInPlace = await fillTemplateForm(pdf, opts);
  } catch (e) {
    // Nunca impedimos la firma por un problema al rellenar: caemos a la
    // página de datos, que conserva toda la información igualmente.
    console.error("[pdf] rellenar formulario", e);
    filledInPlace = 0;
  }

  // ------ Página añadida con los DATOS (solo si no se pudieron incrustar) ------
  if (!filledInPlace) {
    let page = pdf.addPage(A4);
    let y = A4[1] - M;
    page.drawText("fitconaurena", { x: M, y, size: 16, font: bold, color: INK });
    page.drawRectangle({ x: M, y: y - 10, width: contentW, height: 2, color: BRAND });
    y -= 40;

    page.drawText(opts.kind === "anexo_salud" ? "Anexo de salud rellenado" : "Datos del contrato rellenados", {
      x: M, y, size: 18, font: bold, color: INK,
    });
    y -= 26;
    page.drawText(opts.title, { x: M, y, size: 10, font, color: MUTED });
    y -= 22;

    const addFieldPage = () => {
      page = pdf.addPage(A4);
      y = A4[1] - M;
      page.drawText("fitconaurena", { x: M, y, size: 12, font: bold, color: MUTED });
      y -= 24;
    };

    for (const f of opts.fields) {
      // Salto de página cuando queda poco espacio.
      if (y < M + 60) addFieldPage();

      // Etiqueta
      const labelLines: number = Math.max(1, Math.ceil(font.widthOfTextAtSize(f.label, 9) / contentW));
      const preLabelY = y;
      y = drawWrapped(page, f.label, { x: M, y, maxW: contentW, size: 9, font, color: MUTED, lineHeight: 12 });
      // Valor
      const val = display(f, opts.fieldValues[f.key]);
      y -= 2;
      y = drawWrapped(page, val, { x: M, y, maxW: contentW, size: 12, font: bold, color: INK, lineHeight: 15 });
      // Separador
      y -= 6;
      page.drawRectangle({ x: M, y, width: contentW, height: 0.6, color: rgb(0.88, 0.88, 0.88) });
      y -= 10;
      // Para evitar warning de variable no usada en despliegue
      void labelLines; void preLabelY;
    }
  }

  // ------ Página final: FIRMA + metadatos ------
  {
    const page = pdf.addPage(A4);
    let y = A4[1] - M;

    page.drawText("fitconaurena", { x: M, y, size: 16, font: bold, color: INK });
    page.drawRectangle({ x: M, y: y - 10, width: contentW, height: 2, color: BRAND });
    y -= 48;

    page.drawText(opts.kind === "anexo_salud" ? "Anexo de salud firmado electrónicamente" : "Contrato firmado electrónicamente", {
      x: M, y, size: 18, font: bold, color: INK,
    });
    y -= 34;

    const row = (label: string, value: string) => {
      page.drawText(label, { x: M, y, size: 10, font, color: MUTED });
      page.drawText(value, { x: M + 130, y, size: 12, font: bold, color: INK });
      y -= 24;
    };

    row("Documento", opts.title);
    row("Firmante", opts.signerName);
    row("Email", opts.signerEmail);
    row("Fecha y hora", `${madridStamp(opts.signedAt)} (hora de Madrid)`);
    row("Versión", `v${opts.version}`);
    row("IP", opts.ip || "—");
    const ua = (opts.userAgent || "—").slice(0, 90);
    row("Dispositivo", ua);

    // La elección del Anexo II-A también en el certificado: así queda a la
    // vista sin tener que buscarla dentro del contrato, que es donde hará falta
    // si algún día hay que acreditarla.
    if (opts.kind !== "anexo_salud") {
      const eleccion = asText(opts.fieldValues.inicio_servicio);
      row(
        "Inicio del servicio",
        eleccion === OPCION_INMEDIATO ? "Opción 1 — Inicio inmediato solicitado"
          : eleccion === OPCION_DIFERIDO ? `Opción 2 — Diferido ${DIAS_DESISTIMIENTO} días`
          : "No consta",
      );
      row(
        "Pérdida del desistimiento",
        eleccion === OPCION_INMEDIATO
          ? (opts.fieldValues.reconoce_perdida === true ? "Aceptado" : "NO aceptado")
          : "No aplica",
      );
    }

    y -= 16;
    page.drawText("Firma:", { x: M, y, size: 10, font, color: MUTED });
    y -= 12;

    const boxW = 260;
    const boxH = 110;
    const scaled = png.scaleToFit(boxW - 16, boxH - 16);
    const boxY = y - boxH;
    page.drawRectangle({
      x: M, y: boxY, width: boxW, height: boxH,
      borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1,
    });
    page.drawImage(png, {
      x: M + (boxW - scaled.width) / 2,
      y: boxY + (boxH - scaled.height) / 2,
      width: scaled.width, height: scaled.height,
    });
    y = boxY - 28;

    const legal =
      "Documento firmado mediante firma electrónica simple (Reglamento eIDAS UE 910/2014). " +
      "La validez de la firma queda acreditada por el registro de identidad, fecha, hora, " +
      "dirección IP y datos rellenados por el firmante en el momento de la aceptación.";
    drawWrapped(page, legal, { x: M, y, maxW: contentW, size: 9, font, color: MUTED, lineHeight: 12 });
  }

  return pdf.save();
}
