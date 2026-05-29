/**
 * Integración con MailerLite (Plan B: doble opt-in propio).
 *
 * MailerLite se usa SOLO como almacén de los suscriptores ya confirmados y como
 * herramienta de email marketing posterior. La verificación del email y el
 * envío del correo de confirmación los hace nuestro propio sistema (ver
 * lib/mailer.ts + /api/confirm). Por eso aquí damos de alta como "active":
 * ya tenemos prueba de consentimiento.
 *
 * Variables:
 *   MAILERLITE_API_KEY  — token de la API (obligatorio).
 *   MAILERLITE_GROUP_ID — grupo destino (por defecto "aurena contenido").
 */

const API_URL = "https://connect.mailerlite.com/api/subscribers";
const DEFAULT_GROUP_ID = "188798542205158754"; // "aurena contenido"

export type AddSubscriberResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function addSubscriber(email: string): Promise<AddSubscriberResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, message: "MAILERLITE_API_KEY no configurada." };
  }

  const groupId = process.env.MAILERLITE_GROUP_ID ?? DEFAULT_GROUP_ID;
  const body: Record<string, unknown> = { email, status: "active" };
  if (groupId) body.groups = [groupId];

  // Reintentos para no perder leads ante caídas puntuales o límites de tasa.
  // Reintentamos solo en errores de red, 429 y 5xx (transitorios).
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

    // 200 = actualizado, 201 = creado. Ambos son éxito.
    if (res.ok) return { ok: true };

    lastStatus = res.status;
    lastMessage = (await res.text().catch(() => "")) || `MailerLite respondió ${res.status}`;

    // 4xx (salvo 429) son errores no transitorios: no reintentamos.
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === MAX_ATTEMPTS) break;
    await sleep(attempt * 500);
  }

  return { ok: false, status: lastStatus, message: lastMessage };
}
