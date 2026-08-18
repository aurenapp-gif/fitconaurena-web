import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sbSelect, sbUpdate } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";

type CalendlyBody = {
  event?: string;
  payload?: { email?: string; scheduled_event?: { start_time?: string } };
};

// Verifica la firma de Calendly (cabecera "Calendly-Webhook-Signature: t=...,v1=...").
function validSignature(header: string | null, raw: string, key: string): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = crypto.createHmac("sha256", key).update(`${t}.${raw}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Webhook de Calendly: marca el lead como "Llamada agendada" (y guarda la fecha)
// al reservar, y limpia la fecha si se cancela. Empareja por email.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  // Sin clave configurada NO se acepta nada: este endpoint es público, y sin
  // comprobar la firma cualquiera podría cambiar el estado y la fecha de
  // llamada de los leads. Mismo criterio que /api/cron: si falta el secreto,
  // se cierra en vez de quedarse abierto.
  if (!key || !validSignature(req.headers.get("calendly-webhook-signature"), raw, key)) {
    if (!key) console.error("[calendly] falta CALENDLY_WEBHOOK_SIGNING_KEY: webhook rechazado");
    return NextResponse.json({ error: "Firma no válida." }, { status: 401 });
  }

  let body: CalendlyBody;
  try {
    body = JSON.parse(raw) as CalendlyBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = normalizeEmail(String(body.payload?.email ?? ""));
  if (!email) return NextResponse.json({ ok: true });

  try {
    if (body.event === "invitee.created") {
      const startTime = body.payload?.scheduled_event?.start_time ?? null;
      const rows = await sbSelect<{ id: number | string; status: string | null }>(
        "leads",
        `select=id,status&email=eq.${encodeURIComponent(email)}`
      );
      const lead = rows[0];
      if (lead) {
        const patch: Record<string, string | null> = { call_at: startTime, updated_at: new Date().toISOString() };
        if (!lead.status || lead.status === "nuevo" || lead.status === "contactada") patch.status = "agendada";
        await sbUpdate("leads", `id=eq.${lead.id}`, patch);
      }
    } else if (body.event === "invitee.canceled") {
      const rows = await sbSelect<{ id: number | string }>("leads", `select=id&email=eq.${encodeURIComponent(email)}`);
      const lead = rows[0];
      if (lead) await sbUpdate("leads", `id=eq.${lead.id}`, { call_at: null, updated_at: new Date().toISOString() });
    }
  } catch (e) {
    console.error("[calendly] webhook", e);
    // Respondemos 200 igualmente para que Calendly no reintente en bucle por un fallo nuestro.
  }

  return NextResponse.json({ ok: true });
}
