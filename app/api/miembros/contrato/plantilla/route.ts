import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbInsert, sbUpload, sbDelete, sbDeleteObject, sbUpdate, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { CONTRACT_BUCKET, type ContractTemplate, type ContractKind } from "@/lib/contract";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sube una PLANTILLA de contrato o de anexo de salud. La coach puede subir
 * varias plantillas de tipo `contrato` (por ejemplo, por precio: 1197, 1497,
 * 1897) y también la del anexo de salud (que se asigna automáticamente a todas
 * las clientas al asignar cualquier contrato).
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const kindRaw = String(form.get("kind") ?? "contrato").trim();
  const kind: ContractKind = kindRaw === "anexo_salud" ? "anexo_salud" : "contrato";
  const file = form.get("file");
  if (!title) return NextResponse.json({ error: "Pon un título a la plantilla." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "Adjunta el PDF de la plantilla." }, { status: 400 });
  const invalid = validateUpload(file, "contract");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const path = `plantilla/${kind}/${safePath(file.name || `${kind}.pdf`)}`;
    await sbUpload(CONTRACT_BUCKET, path, await file.arrayBuffer(), "application/pdf");
    await sbInsert("contract_templates", {
      title,
      kind,
      file_path: path,
      version: 1,
      active: true,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[contrato/plantilla POST]", err);
    return NextResponse.json({ error: "No se pudo subir la plantilla." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DESACTIVA una plantilla (soft delete) o la borra si aún no tiene firmas. Solo
 * la coach. Las firmas ya emitidas se conservan (evidencia). Espera `?id=<uuid>`.
 */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  try {
    const rows = await sbSelect<ContractTemplate>(
      "contract_templates",
      `select=*&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const tpl = rows[0];
    if (!tpl) return NextResponse.json({ error: "Plantilla no encontrada." }, { status: 404 });

    const signed = await sbSelect<{ id: string }>(
      "contract_signatures",
      `select=id&template_id=eq.${encodeURIComponent(id)}&limit=1`
    ).catch(() => []);

    if (signed.length) {
      // Hay firmas: mantener la plantilla como histórico pero desactivarla para
      // que ya no se asigne ni aparezca a nuevas clientas.
      await sbUpdate("contract_templates", `id=eq.${encodeURIComponent(id)}`, { active: false, updated_at: new Date().toISOString() });
    } else {
      // No hay firmas: se puede borrar entera (fila + PDF).
      if (tpl.file_path) await sbDeleteObject(CONTRACT_BUCKET, tpl.file_path);
      await sbDelete("contract_templates", `id=eq.${encodeURIComponent(id)}`);
    }
  } catch (err) {
    console.error("[contrato/plantilla DELETE]", err);
    return NextResponse.json({ error: "No se pudo eliminar la plantilla." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
