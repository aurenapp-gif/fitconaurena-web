/**
 * Pluggable transactional mailer for the lead-magnet flow.
 *
 * If RESEND_API_KEY is set, emails are sent via Resend (https://resend.com).
 * Otherwise the message is logged to the server console so the whole flow is
 * exercisable locally with zero configuration. Swap in any provider by
 * implementing the `send` step below.
 */

const FROM = process.env.LEAD_FROM_EMAIL ?? "Fit con Aurena <hola@fitconaurena.com>";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev / unconfigured fallback: log instead of sending.
    console.info(
      `[mailer] RESEND_API_KEY not set — would send email:\n` +
        `  to:      ${to}\n` +
        `  subject: ${subject}\n` +
        `  text:    ${text}`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const subject = "Confirma tu email para recibir tu guía gratis 💪";
  const text =
    `¡Hola!\n\n` +
    `Confirma tu email para recibir la Guía Fit con Aurena gratis.\n\n` +
    `Verifica aquí: ${verifyUrl}\n\n` +
    `Este enlace caduca en 24 horas. Si no has solicitado nada, ignora este mensaje.`;

  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,system-ui,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#CAFF00;">con</span>aurena</p>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;">Confirma tu email</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 28px;">
        Estás a un clic de recibir tu <strong style="color:#fff;">Guía Fit con Aurena</strong> gratis.
        Pulsa el botón para confirmar que este email es tuyo.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#CAFF00;color:#0A0A0A;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">
        Confirmar y recibir la guía
      </a>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:28px 0 0;">
        Este enlace caduca en 24 horas. Si no has solicitado nada, puedes ignorar este mensaje.
      </p>
    </div>
  </div>`;

  await send({ to, subject, html, text });
}
