/**
 * Envío del email de verificación vía Resend (https://resend.com).
 *
 * Requiere RESEND_API_KEY. El remitente (RESEND_FROM) debe pertenecer a un
 * dominio verificado en Resend para poder enviar a cualquier destinatario;
 * mientras no se verifique el dominio, Resend solo permite enviar al email de
 * la propia cuenta (modo prueba).
 */

import { fetchWithTimeout } from "@/lib/http";
import { SITE_URL, MEMBER_AREA_URL } from "@/lib/config";

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
      <p style="font-weight:900;font-size:20px;margin:0 0 28px;letter-spacing:-0.5px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:26px;font-weight:800;margin:0 0 16px;line-height:1.2;">Confirma tu email</h1>
      <p style="color:#A0A0A0;line-height:1.65;margin:0 0 28px;font-size:15px;">
        Estás a un clic de acceder a tu <strong style="color:#fff;">contenido gratuito</strong>.
        Pulsa el botón para confirmar que este correo es tuyo y entrar al instante.
      </p>
      <a href="${confirmUrl}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:15px 30px;border-radius:12px;font-size:15px;">
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
  to: string | string[];
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

  const res = await fetchWithTimeout("https://api.resend.com/emails", {
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
  motivacion?: string;
}): Promise<void> {
  const verdict = args.qualified ? "✅ CALIFICA" : "❌ NO califica";
  const subject = `${args.qualified ? "✅" : "❌"} Nueva solicitud — ${args.nombre} (${verdict})`;

  const text =
    `Nueva solicitud del servicio\n\n` +
    `Resultado: ${verdict}\n\n` +
    `Nombre: ${args.nombre}\n` +
    `Email: ${args.email}\n` +
    `Teléfono/WhatsApp: ${args.telefono}\n\n` +
    `Respuestas:\n${args.answersText}\n` +
    (args.motivacion ? `\nMotivación / objetivo:\n${args.motivacion}\n` : "");

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
    ${args.motivacion ? `<p style="color:#666;margin:16px 0 4px;font-size:13px;">Motivación / objetivo:</p><p style="background:#f6f6f6;border-radius:8px;padding:16px;font-size:14px;line-height:1.5;white-space:pre-wrap;">${args.motivacion}</p>` : ""}
  </div>`;

  await send({ to: args.to, subject, html, text, replyTo: args.email });
}

/** Avisa a la coach de que una clienta ha firmado el contrato. */
export async function sendContractSignedNotice(to: string[], member: string, name: string): Promise<void> {
  const url = `${SITE_URL}/miembros/clientas/${encodeURIComponent(member)}`;
  const subject = `✍️ ${name} ha firmado el contrato`;
  const text = `${name} (${member}) ha firmado el contrato. Descárgalo firmado en su ficha: ${url}`;
  const html = `
  <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0A0A0A;padding:24px;max-width:520px;margin:0 auto;">
    <h2 style="margin:0 0 8px;">Contrato firmado ✍️</h2>
    <p style="font-size:14px;line-height:1.5;"><strong>${name}</strong> (${member}) ha firmado el contrato.</p>
    <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:8px;">Ver y descargar firmado</a>
  </div>`;
  await send({ to, subject, html, text });
}

/** Avisa a la coach de que una clienta ha subido un vídeo de técnica. */
export async function sendTechniqueUploadNotice(to: string[], fromMember: string, exercise: string): Promise<void> {
  const url = `${SITE_URL}/miembros/tecnica`;
  const ex = exercise ? ` (${exercise})` : "";
  const subject = `🎥 ${fromMember} ha subido un vídeo de técnica`;
  const text = `${fromMember} ha subido un vídeo de técnica${ex} para que se lo corrijas.\n\nReví­salo: ${url}`;
  const html = `
  <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0A0A0A;padding:24px;max-width:520px;margin:0 auto;">
    <h2 style="margin:0 0 8px;">Nuevo vídeo de técnica 🎥</h2>
    <p style="font-size:14px;line-height:1.5;"><strong>${fromMember}</strong> ha subido un vídeo${ex} para que se lo corrijas.</p>
    <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:8px;">Revisar el vídeo</a>
  </div>`;
  await send({ to, subject, html, text });
}

/** Avisa a la clienta de que su coach ha corregido su vídeo de técnica. */
export async function sendTechniqueReplyEmail(to: string): Promise<void> {
  const url = `${SITE_URL}/miembros/tecnica`;
  const subject = "Tu coach ha corregido tu técnica 🎯";
  const text = `Tu coach ha revisado tu vídeo de técnica y te ha dejado su corrección. Míralo aquí: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Corrección de técnica lista 🎯</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 26px;font-size:15px;">Tu coach ha revisado tu vídeo y te ha dejado su corrección. Entra para verla.</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Ver mi corrección</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/** Email de bienvenida con acceso (al dar de alta a una clienta). */
export async function sendWelcomeEmail(to: string, loginUrl: string): Promise<void> {
  const subject = "¡Bienvenida a Fit con Aurena! 💚 Tu área privada";
  const text =
    `¡Bienvenida!\n\nYa tienes acceso a tu área privada de Fit con Aurena: tu perfil, tu plan, ` +
    `tus check-ins y la revisión de técnica.\n\nEntra aquí: ${loginUrl}\n\nNos vemos dentro 💪`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 28px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;">¡Bienvenida! 💚</h1>
      <p style="color:#A0A0A0;line-height:1.65;margin:0 0 28px;font-size:15px;">
        Ya tienes acceso a tu <strong style="color:#fff;">área privada</strong>: tu perfil, tu plan de
        nutrición y entrenamiento, tus check-ins y la revisión de técnica.
      </p>
      <a href="${loginUrl}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:15px 30px;border-radius:12px;font-size:15px;">
        Entrar a mi área
      </a>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:30px 0 0;">
        ¿El botón no funciona? Entra en fitconaurena.com/miembros/acceso con este mismo email.
      </p>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/** Avisa a la clienta de que su coach respondió a su check-in. */
export async function sendCheckinReplyEmail(to: string): Promise<void> {
  const subject = "Tu coach ha respondido a tu check-in 💬";
  const url = `${SITE_URL}/miembros/checkins`;
  const text = `Tu coach ha respondido a tu último check-in. Entra a verlo: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Tu coach te ha respondido 💬</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 26px;font-size:15px;">Aurena ha comentado tu último check-in. Entra para verlo.</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Ver mi check-in</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/** Aviso a la clienta sobre el estado de su plan (secuencia de espera + disponible). */
export async function sendPlanUpdateEmail(
  to: string,
  opts: { subject: string; heading: string; message: string; cta?: string }
): Promise<void> {
  const url = `${SITE_URL}/miembros/perfil`;
  const cta = opts.cta ?? "Ir a mi área";
  const text = `${opts.heading}\n\n${opts.message}\n\nEntra: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">${opts.heading}</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 26px;font-size:15px;">${opts.message}</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">${cta}</a>
    </div>
  </div>`;
  await send({ to, subject: opts.subject, html, text });
}

// Sala de la videollamada. Preferimos CALL_URL (solo servidor); se mantiene
// NEXT_PUBLIC_CALL_URL por compatibilidad con la configuración anterior.
const CALL_URL = process.env.CALL_URL ?? process.env.NEXT_PUBLIC_CALL_URL ?? MEMBER_AREA_URL;

/** Recordatorio de la videollamada grupal (jueves 17:30). */
export async function sendCallReminder(to: string): Promise<void> {
  const subject = "📹 Hoy videollamada grupal a las 17:30";
  const text = `¡Hoy es jueves! Nos vemos en la videollamada grupal a las 17:30 (hora de Madrid).\n\nEntra a la sala: ${CALL_URL}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Hoy videollamada grupal 📹</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 24px;font-size:15px;">Te esperamos hoy a las <strong style="color:#fff;">17:30 (Madrid)</strong>.</p>
      <a href="${CALL_URL}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Acceder a la sala</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/** Recordatorio para que la clienta suba su revisión (check-in). */
export async function sendCheckinReminder(to: string): Promise<void> {
  const subject = "📸 Toca tu revisión quincenal";
  const url = `${SITE_URL}/miembros/checkins`;
  const text = `Han pasado ~15 días: toca subir tu revisión (peso + 3 fotos). Hazla aquí: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Toca tu revisión 📸</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 24px;font-size:15px;">Han pasado unos 15 días. Sube tu <strong style="color:#fff;">peso y tus 3 fotos</strong> (frente, perfil, espaldas) para seguir tu progreso.</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Hacer mi revisión</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/** Envía el enlace mágico de acceso + código (para la app instalada). */
export async function sendMagicLink(to: string, loginUrl: string, code: string): Promise<void> {
  const subject = "Tu acceso al área de miembros — Fit con Aurena";
  const text =
    `Para entrar desde el navegador, pulsa este enlace:\n${loginUrl}\n\n` +
    `Si usas la app instalada, escribe este código: ${code}\n\n` +
    `Caduca en 15 minutos. Si no lo has solicitado, ignora este mensaje.`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 28px;letter-spacing:-0.5px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;">Tu acceso al área de miembros</h1>
      <p style="color:#A0A0A0;line-height:1.65;margin:0 0 20px;font-size:15px;">
        Desde el navegador, pulsa el botón:
      </p>
      <a href="${loginUrl}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:15px 30px;border-radius:12px;font-size:15px;">
        Entrar al área de miembros
      </a>
      <p style="color:#A0A0A0;line-height:1.6;margin:28px 0 6px;font-size:15px;">
        Si usas la <strong style="color:#fff;">app instalada</strong>, escribe este código:
      </p>
      <p style="font-size:34px;font-weight:900;letter-spacing:8px;color:#1CA0E3;margin:0;">${code}</p>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:24px 0 0;">
        Caduca en 15 minutos. Si no lo has solicitado, ignora este mensaje.
      </p>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}
