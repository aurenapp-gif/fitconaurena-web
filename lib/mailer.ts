/**
 * Envío del email de verificación vía Resend (https://resend.com).
 *
 * Requiere RESEND_API_KEY. El remitente (RESEND_FROM) debe pertenecer a un
 * dominio verificado en Resend para poder enviar a cualquier destinatario;
 * mientras no se verifique el dominio, Resend solo permite enviar al email de
 * la propia cuenta (modo prueba).
 */

const FROM = process.env.RESEND_FROM ?? "Fit con Aurena <onboarding@resend.dev>";

export async function sendVerificationEmail(to: string, confirmUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const subject = "Confirma tu email para acceder al contenido gratuito";
  const text =
    `Confirma tu email para acceder al contenido gratuito de Fit con Aurena.\n\n` +
    `Accede aquí: ${confirmUrl}\n\n` +
    `Así nos aseguramos de que el correo es tuyo. El enlace caduca en 24 horas. ` +
    `Si no lo has solicitado, ignora este mensaje.`;

  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 28px;letter-spacing:-0.5px;">fit<span style="color:#CAFF00;">con</span>aurena</p>
      <h1 style="font-size:26px;font-weight:800;margin:0 0 16px;line-height:1.2;">Confirma tu email</h1>
      <p style="color:#A0A0A0;line-height:1.65;margin:0 0 28px;font-size:15px;">
        Estás a un clic de acceder a tu <strong style="color:#fff;">contenido gratuito</strong>.
        Pulsa el botón para confirmar que este correo es tuyo y entrar al instante.
      </p>
      <a href="${confirmUrl}" style="display:inline-block;background:#CAFF00;color:#0A0A0A;font-weight:700;text-decoration:none;padding:15px 30px;border-radius:12px;font-size:15px;">
        Acceder al contenido
      </a>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:30px 0 0;">
        El enlace caduca en 24 horas. Si no has solicitado nada, puedes ignorar este mensaje.
      </p>
    </div>
  </div>`;

  await send({ to, subject, html, text });
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

async function send({ to, subject, html, text, replyTo }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no configurada");

  const payload: Record<string, unknown> = { from: FROM, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

/** Notifica al equipo de una nueva solicitud del servicio (/aplicar). */
export async function sendApplicationNotification(args: {
  to: string;
  nombre: string;
  email: string;
  telefono: string;
  qualified: boolean;
  answersText: string;
}): Promise<void> {
  const verdict = args.qualified ? "✅ CALIFICA" : "❌ NO califica";
  const subject = `${args.qualified ? "✅" : "❌"} Nueva solicitud — ${args.nombre} (${verdict})`;

  const text =
    `Nueva solicitud del servicio\n\n` +
    `Resultado: ${verdict}\n\n` +
    `Nombre: ${args.nombre}\n` +
    `Email: ${args.email}\n` +
    `Teléfono/WhatsApp: ${args.telefono}\n\n` +
    `Respuestas:\n${args.answersText}\n`;

  const color = args.qualified ? "#16a34a" : "#dc2626";
  const html = `
  <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0A0A0A;padding:24px;max-width:560px;margin:0 auto;">
    <h2 style="margin:0 0 8px;">Nueva solicitud del servicio</h2>
    <p style="font-size:18px;font-weight:800;color:${color};margin:0 0 20px;">${verdict}</p>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Nombre</td><td style="padding:4px 0;font-weight:600;">${args.nombre}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="padding:4px 0;font-weight:600;">${args.email}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Teléfono/WhatsApp</td><td style="padding:4px 0;font-weight:600;">${args.telefono}</td></tr>
    </table>
    <pre style="white-space:pre-wrap;background:#f6f6f6;border-radius:8px;padding:16px;font-size:13px;line-height:1.5;font-family:inherit;">${args.answersText}</pre>
  </div>`;

  await send({ to: args.to, subject, html, text, replyTo: args.email });
}
