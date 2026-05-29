/**
 * MailerLite integration for the lead-magnet flow.
 *
 * MailerLite is the source of truth: it stores subscribers AND sends the
 * double opt-in confirmation email. We just upsert the subscriber into a group.
 *
 * IMPORTANT — for the confirmation email to be sent, the MailerLite account
 * must have "Double opt-in for API and integrations" enabled
 * (Settings → Subscribe settings). With it on, a subscriber created with the
 * default status is left as `unconfirmed` and receives the confirmation email;
 * they cannot be emailed anything else until they confirm. This is what
 * guarantees the address is genuinely theirs and keeps future mail out of spam.
 *
 * Required env:
 *   MAILERLITE_API_KEY  — API token (Integrations → API).
 * Optional env:
 *   MAILERLITE_GROUP_ID — group to add the subscriber to (recommended, so an
 *                         automation can deliver the guide on confirmation).
 */

const API_URL = "https://connect.mailerlite.com/api/subscribers";

export type AddSubscriberResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export async function addSubscriber(email: string): Promise<AddSubscriberResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, message: "MAILERLITE_API_KEY no configurada." };
  }

  const groupId = process.env.MAILERLITE_GROUP_ID;
  const body: Record<string, unknown> = { email };
  if (groupId) body.groups = [groupId];
  // Status is intentionally omitted: with "double opt-in for API" enabled,
  // the default status keeps the subscriber unconfirmed and triggers the
  // confirmation email. Forcing "active" would violate MailerLite's anti-spam
  // policy and skip the verification the user explicitly wants.

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
    return { ok: false, status: 502, message: `No se pudo contactar con MailerLite: ${String(err)}` };
  }

  // 200 = updated existing, 201 = created. Both are success for our purposes.
  if (res.ok) return { ok: true };

  const detail = await res.text().catch(() => "");
  return { ok: false, status: res.status, message: detail || `MailerLite respondió ${res.status}` };
}
