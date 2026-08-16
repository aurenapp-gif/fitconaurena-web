import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbInsertIgnore, sbDelete } from "@/lib/supabase";
import { sendPushToEmails } from "@/lib/push";
import type { ContractTemplate } from "@/lib/contract";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Asigna una plantilla a una clienta. Además, si aún no lo tenía, le asigna
 * automáticamente la plantilla ACTIVA de anexo de salud (común a todas).
 *
 * Body: { memberEmail, templateId }
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { memberEmail?: string; templateId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const memberEmail = (body.memberEmail ?? "").trim().toLowerCase();
  const templateId = (body.templateId ?? "").trim();
  if (!memberEmail || !templateId) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  try {
    const tplRows = await sbSelect<ContractTemplate>(
      "contract_templates",
      `select=*&id=eq.${encodeURIComponent(templateId)}&limit=1`
    );
    const tpl = tplRows[0];
    if (!tpl || !tpl.active) return NextResponse.json({ error: "Plantilla no válida." }, { status: 404 });

    // 1) La plantilla que ha elegido la coach.
    await sbInsertIgnore("contract_assignments", {
      member_email: memberEmail,
      template_id: templateId,
      status: "pendiente",
      assigned_by: me,
      assigned_at: new Date().toISOString(),
    });

    // 2) Anexo de salud (si existe uno activo y aún no lo tiene asignado).
    if (tpl.kind === "contrato") {
      const anexoRows = await sbSelect<ContractTemplate>(
        "contract_templates",
        "select=id&kind=eq.anexo_salud&active=is.true&order=created_at.desc&limit=1"
      ).catch(() => []);
      const anexo = anexoRows[0];
      if (anexo) {
        await sbInsertIgnore("contract_assignments", {
          member_email: memberEmail,
          template_id: anexo.id,
          status: "pendiente",
          assigned_by: me,
          assigned_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error("[contrato/asignar POST]", err);
    return NextResponse.json({ error: "No se pudo asignar." }, { status: 500 });
  }

  // Notificación push (silenciosa si falla).
  sendPushToEmails([memberEmail], {
    title: "Tienes un contrato pendiente",
    body: "Fírmalo desde tu área privada para poder empezar.",
    url: "/miembros/contrato",
  }).catch((e) => console.error("[contrato/asignar] push", e));

  return NextResponse.json({ ok: true });
}

/**
 * Retira una asignación PENDIENTE (solo si aún no está firmada). Body:
 * { assignmentId }.
 */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  try {
    await sbDelete("contract_assignments", `id=eq.${encodeURIComponent(id)}&status=eq.pendiente`);
  } catch (err) {
    console.error("[contrato/asignar DELETE]", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
