/**
 * El PDF de estrategia del mes, el que la coach le manda por WhatsApp.
 *
 * Tiene tres partes y ese orden no es casual: primero lo que ha conseguido
 * (los datos, sin maquillar), después por dónde va del recorrido, y al final
 * lo que toca este mes. Se lee de arriba abajo y responde a «¿voy bien?» antes
 * de pedirle nada.
 *
 * Los números los pone el servidor con los datos reales, no el formulario: lo
 * que escribe la coach son sus notas, no las cifras.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const MARGEN = 56;
const ANCHO = A4[0] - MARGEN * 2;

const TINTA = rgb(0.11, 0.11, 0.1);
const SUAVE = rgb(0.38, 0.36, 0.33);
const MARCA = rgb(0.05, 0.43, 0.62);
const LINEA = rgb(0.87, 0.85, 0.82);

export type BloqueTexto = { titulo: string; cuerpo: string };

export type DatosEstrategia = {
  nombre: string;
  fecha: Date;
  coach: string;
  /** «Fase 3 de 6» y el nombre de la fase, si tiene mapa. */
  fase?: { actual: number; total: number; titulo: string; detalle?: string | null } | null;
  /** Todas las fases, para que vea el recorrido entero. */
  recorrido?: { posicion: number; titulo: string }[];
  /** Lo que dicen sus datos este mes. Cada línea es «concepto: valor». */
  datos: { etiqueta: string; valor: string }[];
  /** Lo que escribe (o dicta) la coach. */
  bloques: BloqueTexto[];
};

/**
 * Deja el texto en lo que sabe escribir la fuente estándar del PDF.
 *
 * pdf-lib con Helvetica solo admite Latin-1: una comilla tipográfica o un
 * emoji dictado por error revientan la generación entera. Mejor cambiar las
 * comunes y quitar el resto que quedarse sin PDF.
 */
export function limpio(s: string): string {
  return String(s ?? "")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[«»]/g, '"')
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
}

type Lapiz = { pdf: PDFDocument; page: PDFPage; y: number; normal: PDFFont; negrita: PDFFont };

function nuevaPagina(l: Lapiz) {
  l.page = l.pdf.addPage(A4);
  l.y = A4[1] - MARGEN;
}

function sitio(l: Lapiz, alto: number) {
  if (l.y - alto < MARGEN) nuevaPagina(l);
}

/** Escribe un párrafo partiéndolo por el ancho, y salta de página si hace falta. */
function parrafo(l: Lapiz, texto: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; lh?: number } = {}) {
  const size = opts.size ?? 11;
  const font = opts.font ?? l.normal;
  const color = opts.color ?? TINTA;
  const lh = opts.lh ?? size + 6;
  for (const bruto of limpio(texto).split("\n")) {
    const palabras = bruto.split(/\s+/).filter(Boolean);
    if (palabras.length === 0) { l.y -= lh * 0.6; continue; }
    let linea = "";
    for (const w of palabras) {
      const prueba = linea ? `${linea} ${w}` : w;
      if (font.widthOfTextAtSize(prueba, size) > ANCHO && linea) {
        sitio(l, lh);
        l.page.drawText(linea, { x: MARGEN, y: l.y, size, font, color });
        l.y -= lh;
        linea = w;
      } else linea = prueba;
    }
    if (linea) {
      sitio(l, lh);
      l.page.drawText(linea, { x: MARGEN, y: l.y, size, font, color });
      l.y -= lh;
    }
  }
}

function titulo(l: Lapiz, texto: string) {
  sitio(l, 46);
  l.y -= 14;
  l.page.drawText(limpio(texto).toUpperCase(), { x: MARGEN, y: l.y, size: 9, font: l.negrita, color: MARCA });
  l.y -= 8;
  l.page.drawLine({ start: { x: MARGEN, y: l.y }, end: { x: MARGEN + ANCHO, y: l.y }, thickness: 0.8, color: LINEA });
  l.y -= 16;
}

const fechaLarga = (d: Date) =>
  d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

export async function pdfEstrategia(d: DatosEstrategia): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const l: Lapiz = { pdf, page: pdf.addPage(A4), y: A4[1] - MARGEN, normal, negrita };

  pdf.setTitle(limpio(`Estrategia de ${d.nombre}`));
  pdf.setAuthor(limpio(d.coach || "Programa FITCON"));
  pdf.setCreationDate(d.fecha);

  // ---- Cabecera ------------------------------------------------------------
  l.page.drawText("PROGRAMA FITCON", { x: MARGEN, y: l.y, size: 9, font: negrita, color: MARCA });
  l.y -= 26;
  l.page.drawText(limpio(`Tu estrategia, ${d.nombre}`), { x: MARGEN, y: l.y, size: 22, font: negrita, color: TINTA });
  l.y -= 16;
  l.page.drawText(limpio(fechaLarga(d.fecha)), { x: MARGEN, y: l.y, size: 10, font: normal, color: SUAVE });
  l.y -= 10;

  // ---- Dónde está ----------------------------------------------------------
  if (d.fase) {
    titulo(l, "Por donde vas");
    sitio(l, 40);
    l.page.drawText(limpio(`Fase ${d.fase.actual} de ${d.fase.total}`), { x: MARGEN, y: l.y, size: 10, font: negrita, color: MARCA });
    l.y -= 18;
    l.page.drawText(limpio(d.fase.titulo), { x: MARGEN, y: l.y, size: 15, font: negrita, color: TINTA });
    l.y -= 18;
    if (d.fase.detalle) parrafo(l, d.fase.detalle, { color: SUAVE });

    if (d.recorrido && d.recorrido.length > 0) {
      l.y -= 6;
      for (const f of d.recorrido) {
        const hecha = f.posicion < d.fase.actual;
        const esta = f.posicion === d.fase.actual;
        sitio(l, 16);
        l.page.drawText(limpio(`${hecha ? "x" : esta ? ">" : "-"}  ${f.posicion}. ${f.titulo}`), {
          x: MARGEN, y: l.y, size: 10.5,
          font: esta ? negrita : normal,
          color: esta ? TINTA : SUAVE,
        });
        l.y -= 16;
      }
    }
  }

  // ---- Lo que dicen sus datos ---------------------------------------------
  if (d.datos.length > 0) {
    titulo(l, "Este mes, en numeros");
    for (const fila of d.datos) {
      sitio(l, 18);
      l.page.drawText(limpio(fila.etiqueta), { x: MARGEN, y: l.y, size: 11, font: normal, color: SUAVE });
      const v = limpio(fila.valor);
      const w = negrita.widthOfTextAtSize(v, 11);
      l.page.drawText(v, { x: MARGEN + ANCHO - w, y: l.y, size: 11, font: negrita, color: TINTA });
      l.y -= 10;
      l.page.drawLine({ start: { x: MARGEN, y: l.y }, end: { x: MARGEN + ANCHO, y: l.y }, thickness: 0.5, color: LINEA });
      l.y -= 10;
    }
  }

  // ---- Lo que escribe la coach --------------------------------------------
  for (const b of d.bloques) {
    if (!limpio(b.cuerpo)) continue;
    titulo(l, b.titulo);
    parrafo(l, b.cuerpo);
  }

  // ---- Cierre --------------------------------------------------------------
  l.y -= 18;
  sitio(l, 30);
  l.page.drawText(limpio(`Vamos a por ello. - ${d.coach}`), { x: MARGEN, y: l.y, size: 11, font: negrita, color: TINTA });

  return pdf.save();
}

/** Nombre del archivo, sin tildes ni espacios: va a WhatsApp. */
export function nombreArchivo(nombre: string, fecha: Date): string {
  const limpioNombre = limpio(nombre)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "clienta";
  return `Estrategia-${limpioNombre}-${fecha.toISOString().slice(0, 10)}.pdf`;
}
