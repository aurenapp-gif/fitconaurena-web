/**
 * Envío de notificaciones Web Push (PWA). SOLO servidor (runtime nodejs).
 *
 * Degradación segura: si faltan las claves VAPID, todas las funciones son no-op
 * silenciosas. Así, mientras no se configuren las variables de entorno, el resto
 * de la app (chat, cron, etc.) sigue funcionando exactamente igual.
 *
 * Variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */

import webpush from "web-push";
import { sbSelect, sbDelete } from "@/lib/supabase";

type Payload = { title: string; body: string; url?: string; tag?: string };
type Sub = { endpoint: string; p256dh: string; auth: string };

let configured: boolean | null = null;

/** ¿Están configuradas las claves VAPID? (memoiza e inicializa web-push). */
function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:aurenapp@gmail.com";
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch (e) {
    console.error("[push] setVapidDetails", e);
    configured = false;
  }
  return configured;
}

/** Envía una notificación a todos los dispositivos suscritos de un email. */
export async function sendPushToEmail(email: string, payload: Payload): Promise<void> {
  if (!pushConfigured()) return; // no-op si no hay claves
  let subs: Sub[] = [];
  try {
    subs = await sbSelect<Sub>(
      "push_subscriptions",
      `select=endpoint,p256dh,auth&member_email=eq.${encodeURIComponent(email)}`
    );
  } catch (e) {
    console.error("[push] select subs", e);
    return;
  }

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
      } catch (err: unknown) {
        // 404/410 = suscripción caducada: la limpiamos para no reintentarla.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await sbDelete("push_subscriptions", `endpoint=eq.${encodeURIComponent(s.endpoint)}`).catch(() => {});
        } else {
          console.error("[push] send", status, err);
        }
      }
    })
  );
}

/** Igual que sendPushToEmail pero para varios destinatarios (ej. admins). */
export async function sendPushToEmails(emails: string[], payload: Payload): Promise<void> {
  if (!pushConfigured()) return;
  await Promise.all(emails.map((e) => sendPushToEmail(e, payload)));
}
