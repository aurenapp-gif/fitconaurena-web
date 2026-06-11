import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbUpload, sbUpsert, safePath } from "@/lib/supabase";
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
    const cur = await sbSelect<ContractTemplate>("contract_template", "select=version&id=eq.1");
    const nextVersion = (cur[0]?.version ?? 0) + 1;
    const path = `plantilla/${safePath(file.name || "contrato.pdf")}`;
    await sbUpload(CONTRACT_BUCKET, path, await file.arrayBuffer(), "application/pdf");
    await sbUpsert("contract_template", {
      id: 1,
      title: title || null,
      file_path: path,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[contrato/plantilla]", err);
    return NextResponse.json({ error: "No se pudo subir el contrato." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
