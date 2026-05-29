/**
 * Integración con MailerLite. Se usa como almacén de suscriptores ya
 * confirmados / aplicantes y para email marketing posterior. La verificación
 * de email del lead magnet la hace nuestro propio sistema (ver lib/mailer.ts).
 *
 * Variables:
 *   MAILERLITE_API_KEY  — token de la API (obligatorio).
 *   MAILERLITE_GROUP_ID — grupo del lead magnet (por defecto "aurena contenido").
 */

const API_URL = "https://connect.mailerlite.com/api/subscribers";
const DEFAULT_GROUP_ID = "188798542205158754"; // "aurena contenido"

export type AddResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** POST a /subscribers con reintentos en errores transitorios (red/429/5xx). */
async function postSubscriber(body: Record<string, unknown>): Promise<AddResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, message: "MAILERLITE_API_KEY no configurada." };
  }

  const MAX_ATTEMPTS = 3;
  let lastStatus = 0;
  let lastMessage = "Error desconocido";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastStatus = 502;
      lastMessage = `No se pudo contactar con MailerLite: ${String(err)}`;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 500);
        continue;
      }
      break;
    }

    if (res.ok) return { ok: true }; // 200 actualizado / 201 creado

    lastStatus = res.status;
    lastMessage = (await res.text().catch(() => "")) || `MailerLite respondió ${res.status}`;
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === MAX_ATTEMPTS) break;
    await sleep(attempt * 500);
  }

  return { ok: false, status: lastStatus, message: lastMessage };
}

/** Lead magnet: alta como confirmado (consentimiento ya probado por nuestro DOI). */
export async function addSubscriber(email: string): Promise<AddResult> {
  const groupId = process.env.MAILERLITE_GROUP_ID ?? DEFAULT_GROUP_ID;
  const body: Record<string, unknown> = { email, status: "active" };
  if (groupId) body.groups = [groupId];
  return postSubscriber(body);
}

/** Aplicante del servicio: alta con nombre/teléfono en el grupo indicado. */
export async function addApplicant(args: {
  email: string;
  name?: string;
  phone?: string;
  groupId: string;
}): Promise<AddResult> {
  const fields: Record<string, string> = {};
  if (args.name) fields.name = args.name;
  if (args.phone) fields.phone = args.phone;

  const body: Record<string, unknown> = {
    email: args.email,
    status: "active",
    groups: [args.groupId],
  };
  if (Object.keys(fields).length) body.fields = fields;
  return postSubscriber(body);
}
