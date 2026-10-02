/**
 * La contabilidad que se lleva sola: un contrato firmado es una venta.
 *
 * Va por `origen` = `contrato:<id de la asignación>`, con índice único en esa
 * columna. Así, firme cuando firme, se reintente lo que se reintente y se
 * pulse «importar» las veces que se pulse, la misma firma no puede apuntarse
 * dos veces. En dinero, apuntar de más es peor que no apuntar.
 *
 * Nunca toca lo que la coach ha escrito a mano: esas filas tienen `origen`
 * vacío y aquí no se mira ninguna.
 */

import { sbInsertIgnore, sbSelect } from "./supabase";
import { ventaDeContrato } from "./contabilidad";

type Firma = { member_email: string; assignment_id: string | null; template_id: string | null; signed_at: string };

/** Apunta la venta de un contrato recién firmado. No lanza: nunca rompe la firma. */
export async function apuntarVentaDeContrato(opts: {
  email: string;
  titulo: string | null;
  assignmentId: string;
  firmadoEl: string;
}): Promise<void> {
  const fila = ventaDeContrato(opts);
  if (!fila) {
    // Sin precio en el título no se inventa una cifra. Queda en el registro
    // para que se pueda apuntar a mano.
    console.error("[ventas-auto] sin precio en el título:", opts.titulo);
    return;
  }
  try {
    await sbInsertIgnore("ventas", fila, "origen");
  } catch (err) {
    console.error("[ventas-auto] no se pudo apuntar la venta", err);
  }
}

export type Importacion = { creadas: number; yaEstaban: number; sinPrecio: string[] };

/**
 * Recorre los contratos ya firmados y apunta los que falten.
 *
 * Sirve para ponerse al día con lo de antes y, de paso, para recuperar
 * cualquier firma cuya venta no se llegara a escribir. Es idempotente: lo que
 * ya está no se duplica.
 */
export async function importarContratosFirmados(): Promise<Importacion> {
  const [firmas, plantillas, ventas] = await Promise.all([
    sbSelect<Firma>("contract_signatures", "select=member_email,assignment_id,template_id,signed_at&order=signed_at.asc"),
    sbSelect<{ id: string; title: string; kind: string }>("contract_templates", "select=id,title,kind"),
    sbSelect<{ origen: string | null }>("ventas", "select=origen"),
  ]);

  const tpl = new Map(plantillas.map((t) => [t.id, t]));
  const yaApuntadas = new Set(ventas.map((v) => v.origen).filter((x): x is string => !!x));
  const res: Importacion = { creadas: 0, yaEstaban: 0, sinPrecio: [] };

  for (const f of firmas) {
    // El anexo de salud no es una venta, y sin asignación no hay llave única.
    const t = f.template_id ? tpl.get(f.template_id) : null;
    if (!t || t.kind !== "contrato" || !f.assignment_id) continue;

    const fila = ventaDeContrato({
      email: f.member_email,
      titulo: t.title,
      assignmentId: f.assignment_id,
      firmadoEl: f.signed_at,
    });
    if (!fila) { res.sinPrecio.push(t.title); continue; }
    if (fila.origen && yaApuntadas.has(fila.origen)) { res.yaEstaban++; continue; }

    try {
      await sbInsertIgnore("ventas", fila, "origen");
      res.creadas++;
    } catch (err) {
      console.error("[ventas-auto] importando", err);
    }
  }
  return res;
}
