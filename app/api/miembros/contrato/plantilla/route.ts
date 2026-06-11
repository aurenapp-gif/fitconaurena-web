import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbUpload, sbUpsert, sbDelete, sbDeleteObject, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { CONTRACT_BUCKET, type ContractTemplate } from "@/lib/contract";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sube (o reemplaza) la PLANTILLA de contrato, la misma para todas las clientas.
 * Solo la coach. Cada subida incrementa la versión: si cambias el contrato, las
 * firmas anteriores quedan asociadas a su versión y las clientas deberán firmar
 * la nueva.
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
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "Adjunta el PDF del contrato." }, { status: 400 });
  const invalid = validateUpload(file, "contract");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    // La versión siguiente es mayor que cualquiera usada antes (plantilla actual
    // o firmas existentes), para que tras borrar y volver a subir no colisione
    // con firmas antiguas de la misma versión.
    const [tplRows, sigRows] = await Promise.all([
      sbSelect<{ version: number }>("contract_template", "select=version&id=eq.1").catch(() => []),
      sbSelect<{ version: number }>("contract_signatures", "select=version&order=version.desc&limit=1").catch(() => []),
    ]);
    const maxV = Math.max(tplRows[0]?.version ?? 0, sigRows[0]?.version ?? 0);
    const path = `plantilla/${safePath(file.name || "contrato.pdf")}`;
    await sbUpload(CONTRACT_BUCKET, path, await file.arrayBuffer(), "application/pdf");
    await sbUpsert("contract_template", {
      id: 1,
      title: title || null,
      file_path: path,
      version: maxV + 1,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[contrato/plantilla]", err);
    return NextResponse.json({ error: "No se pudo subir el contrato." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Borra la plantilla de contrato en uso (la fila única + el PDF de Storage). Las
 * firmas ya hechas se conservan en el historial. Tras borrar, no se muestra
 * contrato a las clientas hasta que se suba uno nuevo. Solo la coach.
 */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const cur = (await sbSelect<ContractTemplate>("contract_template", "select=*&id=eq.1"))[0];
    if (cur?.file_path) await sbDeleteObject(CONTRACT_BUCKET, cur.file_path);
    await sbDelete("contract_template", "id=eq.1");
  } catch (err) {
    console.error("[contrato/plantilla DELETE]", err);
    return NextResponse.json({ error: "No se pudo borrar el contrato." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
