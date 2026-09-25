/**
 * Envío del email de verificación vía Resend (https://resend.com).
 *
 * Requiere RESEND_API_KEY. El remitente (RESEND_FROM) debe pertenecer a un
 * dominio verificado en Resend para poder enviar a cualquier destinatario;
 * mientras no se verifique el dominio, Resend solo permite enviar al email de
 * la propia cuenta (modo prueba).
 */

import { fetchWithTimeout } from "@/lib/http";
import { TEXTO_DIA_LLAMADA, TEXTO_DIA_LLAMADA_SINGULAR, TEXTO_HORA_LLAMADA } from "@/lib/llamada-grupal";
import { enlaceSala } from "@/lib/ajustes";
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

/**
 * Envía por Resend, con reintentos.
 *
 * Antes se abortaba a los 8 segundos y ese correo se perdía sin más: en los
 * registros aparecían envíos cortados por tiempo. Un correo perdido no es un
 * detalle — puede ser el enlace de acceso de una clienta nueva —, así que se da
 * más margen y se reintenta ante un corte de tiempo, un fallo de red o un error
 * temporal de Resend (429 o 5xx). Un rechazo definitivo (dirección inválida,
 * clave mal) no se reintenta: fallaría igual.
 */
async function send({ to, subject, html, text, replyTo }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no configurada");

  const payload: Record<string, unknown> = { from: FROM, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;

  const INTENTOS = 3;
  let ultimo = new Error("Resend: no se pudo enviar");

  for (let intento = 1; intento <= INTENTOS; intento++) {
    const r = await enviarUnaVez(apiKey, payload);
    if (r.ok) return;
    ultimo = r.error;
    if (!r.reintentable || intento === INTENTOS) break;
    await new Promise((res) => setTimeout(res, intento * 1000));
  }

  throw ultimo;
}

type Intento = { ok: true } | { ok: false; error: Error; reintentable: boolean };

/** Un solo envío. Distingue lo que merece otro intento de lo que no. */
async function enviarUnaVez(apiKey: string, payload: Record<string, unknown>): Promise<Intento> {
  try {
    const res = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }, 12000);

    if (res.ok) return { ok: true };

    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: new Error(`Resend send failed (${res.status}): ${body}`),
      // Saturación o avería de Resend: reintentable. Un 4xx (dirección mal,
      // clave inválida) fallaría igual, así que no se insiste.
      reintentable: res.status === 429 || res.status >= 500,
    };
  } catch (err) {
    // Corte por tiempo o fallo de red: es justo el caso que perdía correos.
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)), reintentable: true };
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
    `tus revisiones y la corrección de técnica.\n\nEntra aquí: ${loginUrl}\n\nNos vemos dentro 💪`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 28px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;">¡Bienvenida! 💚</h1>
      <p style="color:#A0A0A0;line-height:1.65;margin:0 0 28px;font-size:15px;">
        Ya tienes acceso a tu <strong style="color:#fff;">área privada</strong>: tu perfil, tu plan de
        alimentación y entrenamiento, tus revisiones y la corrección de técnica.
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

/**
 * La bienvenida de verdad: cuando ya está todo firmado y entra a su área.
 *
 * El correo del alta es logística —«aquí tienes tu enlace»—. Este es el otro:
 * llega cuando ha terminado de firmar, que es el momento en que deja de hacer
 * papeleo y empieza el programa. Le dice qué tiene, por dónde empezar y que
 * hay alguien al otro lado.
 *
 * `tienePlan` cambia una frase: prometerle un plan que su coach todavía no ha
 * subido es la forma más rápida de que el primer día sea una decepción.
 */
export function bienvenidaFirmada(
  opts: { nombre?: string | null; coach: string }
): { subject: string; html: string; text: string } {
  const nombre = (opts.nombre ?? "").trim().split(/\s+/)[0] || "";
  const url = `${SITE_URL}/miembros`;
  const coach = escapeHtml(opts.coach);

  // Esto es una bienvenida, no un manual ni un aviso. Nada de contratos, nada
  // de condiciones, nada de lo que le va a costar. Hoy solo toca celebrar que
  // ha empezado.
  const subject = nombre
    ? `Bienvenida al Programa FITCON, ${nombre} 💚`
    : "Bienvenida al Programa FITCON 💚";

  const text =
    `${nombre ? `Bienvenida, ${nombre}.` : "Bienvenida."}\n\n` +
    `Hoy empieza tu transformación.\n\n` +
    `No el lunes que viene, ni cuando pase el verano, ni cuando llegue el momento perfecto. Hoy.\n\n` +
    `Estás a punto de descubrir de lo que eres capaz, y te vas a sorprender. Porque esto no es un mes ` +
    `de buenas intenciones: es tu futuro. Tu energía, tus fuerzas, y la manera en que te vas a mirar al ` +
    `espejo dentro de unos meses.\n\n` +
    `Y no lo vas a hacer sola. Yo voy contigo, paso a paso, desde hoy.\n\n` +
    `Dentro te espera todo lo tuyo, preparado para ti. Entra y empieza.\n\n` +
    `${url}\n\n` +
    `Esto es solo el principio${nombre ? `, ${nombre}` : ""}.\n\n` +
    `Vamos a por ello. — ${opts.coach}`;

  /*
   * POR QUÉ ESTE CORREO ES CLARO Y NO OSCURO.
   *
   * El fondo negro se veía mal en los dos modos, y no es cosa del diseño: en
   * modo oscuro, Gmail le da la vuelta a los colores por su cuenta y un correo
   * que ya era oscuro acaba con texto claro sobre fondo claro. Y si un cliente
   * se come el fondo pero respeta el color de la letra —pasa—, el texto blanco
   * desaparece sobre blanco.
   *
   * Con un correo claro eso no ocurre: el texto es oscuro, y si alguien lo
   * invierte, queda claro sobre oscuro, que se sigue leyendo. Encima aquí se
   * declaran los DOS modos a mano, para que quien respete `prefers-color-scheme`
   * use estos colores y no los que se invente.
   *
   * El azul de marca (#1CA0E3) sobre blanco da 2,9:1 de contraste: vale para un
   * logo, no para leer. Por eso el texto azul y el botón usan #0E6E9E, que da
   * 5,2:1 y sigue siendo el mismo azul, más hondo.
   */
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .fondo   { background:#141310 !important; }
    .tarjeta { background:#1E1D1A !important; }
    .tinta   { color:#F3F0EA !important; }
    .suave   { color:#B3ADA3 !important; }
    .acento  { color:#5FB4EE !important; }
    .raya    { background:#33302A !important; }
    .boton   { background:#1CA0E3 !important; }
  }
</style>
</head>
<body class="fondo" style="margin:0;padding:0;background:#F4F2EE;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="fondo" style="background:#F4F2EE;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="tarjeta" style="max-width:520px;background:#FFFFFF;border-radius:18px;">
          <tr>
            <td style="padding:40px 32px;font-family:Inter,Helvetica,Arial,sans-serif;">

              <p class="tinta" style="font-weight:900;font-size:20px;margin:0 0 34px;letter-spacing:-0.5px;color:#1C1B19;">fit<span class="acento" style="color:#0E6E9E;">con</span>aurena</p>

              <p class="acento" style="margin:0 0 12px;color:#0E6E9E;font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Programa FITCON</p>
              <h1 class="tinta" style="font-size:32px;font-weight:800;margin:0 0 10px;line-height:1.12;letter-spacing:-0.7px;color:#1C1B19;">
                ${nombre ? `Bienvenida, ${escapeHtml(nombre)}` : "Bienvenida"} 💚
              </h1>
              <p class="acento" style="font-size:21px;font-weight:700;color:#0E6E9E;margin:0 0 28px;line-height:1.3;letter-spacing:-0.3px;">
                Hoy empieza tu transformación.
              </p>

              <p class="tinta" style="color:#2A2825;line-height:1.75;margin:0 0 20px;font-size:17px;">
                No el lunes que viene, ni cuando pase el verano, ni cuando llegue el momento perfecto.
                <strong class="tinta" style="color:#1C1B19;">Hoy.</strong>
              </p>
              <p class="tinta" style="color:#2A2825;line-height:1.75;margin:0 0 20px;font-size:17px;">
                Estás a punto de descubrir de lo que eres capaz, y te vas a sorprender. Porque esto no es un mes de
                buenas intenciones: <strong class="tinta" style="color:#1C1B19;">es tu futuro.</strong> Tu energía, tus
                fuerzas, y la manera en que te vas a mirar al espejo dentro de unos meses.
              </p>
              <p class="tinta" style="color:#2A2825;line-height:1.75;margin:0 0 32px;font-size:17px;">
                Y no lo vas a hacer sola. <strong class="tinta" style="color:#1C1B19;">Yo voy contigo</strong>, paso a paso, desde hoy.
              </p>

              <p class="suave" style="color:#615C55;line-height:1.7;margin:0 0 22px;font-size:16px;">
                Dentro te espera todo lo tuyo, preparado para ti.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="boton" style="background:#0E6E9E;border-radius:12px;">
                    <a href="${url}" style="display:inline-block;color:#FFFFFF;font-family:Inter,Helvetica,Arial,sans-serif;font-weight:700;text-decoration:none;padding:17px 40px;font-size:17px;">
                      Entrar y empezar
                    </a>
                  </td>
                </tr>
              </table>

              <div class="raya" style="height:1px;background:#E7E2D9;margin:38px 0 26px;font-size:0;line-height:0;">&nbsp;</div>

              <p class="tinta" style="color:#1C1B19;font-size:19px;font-weight:800;line-height:1.4;margin:0 0 10px;letter-spacing:-0.3px;">
                Esto es solo el principio${nombre ? `, ${escapeHtml(nombre)}` : ""}.
              </p>
              <p class="suave" style="color:#615C55;font-size:16px;line-height:1.6;margin:0;">
                Vamos a por ello. — <strong class="tinta" style="color:#1C1B19;">${coach}</strong>
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function sendBienvenidaFirmada(
  to: string,
  opts: { nombre?: string | null; coach: string }
): Promise<void> {
  await send({ to, ...bienvenidaFirmada(opts) });
}

/** Avisa a la clienta de que su coach respondió a su check-in. */
export async function sendCheckinReplyEmail(to: string): Promise<void> {
  const subject = "Tu coach te ha escrito sobre tu revisión";
  const url = `${SITE_URL}/miembros/checkins`;
  const text = `Tu coach te ha escrito sobre tu última revisión. Entra a verlo: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Tu coach te ha respondido 💬</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 26px;font-size:15px;">Tu coach te ha escrito sobre tu última revisión. Entra para verlo.</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Ver mi revisión</a>
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

/** Escapa el texto que se incrusta en el HTML del email, para que un `<` o un
 * `&` sueltos no rompan el maquetado del correo. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Comunicado de la coach a una clienta. */
export async function sendAnnouncementEmail(to: string, opts: { title: string; body: string }): Promise<void> {
  const url = `${SITE_URL}/miembros/comunicados`;
  const subject = `📣 ${opts.title}`;
  const text = `${opts.title}\n\n${opts.body}\n\nVer en tu área: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <p style="color:#1CA0E3;font-size:12px;font-weight:700;letter-spacing:1px;margin:0 0 8px;">COMUNICADO</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">${escapeHtml(opts.title)}</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 26px;font-size:15px;white-space:pre-wrap;">${escapeHtml(opts.body)}</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Ver comunicados</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

// Sala de la videollamada. Preferimos CALL_URL (solo servidor); se mantiene
// NEXT_PUBLIC_CALL_URL por compatibilidad con la configuración anterior.
// El enlace lo guarda la coach desde su Panel (lib/ajustes); la variable de
// entorno queda de respaldo.

/** Recordatorio de la videollamada grupal (día y hora en lib/llamada-grupal). */
export async function sendCallReminder(to: string): Promise<void> {
  const CALL_URL = await enlaceSala();
  const subject = `📹 Hoy videollamada grupal a las ${TEXTO_HORA_LLAMADA}`;
  const text = `¡Hoy es ${TEXTO_DIA_LLAMADA_SINGULAR}! Nos vemos en la videollamada grupal a las ${TEXTO_HORA_LLAMADA} (hora de Madrid).\n\nEntra a la sala: ${CALL_URL}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Hoy videollamada grupal 📹</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 24px;font-size:15px;">Te esperamos hoy a las <strong style="color:#fff;">${TEXTO_HORA_LLAMADA} (Madrid)</strong>.</p>
      <a href="${CALL_URL}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Acceder a la sala</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/**
 * Recordatorio para que la clienta suba su revisión (check-in).
 *
 * El texto lo decide `textoAviso` según lo que se haya retrasado: no es lo
 * mismo el aviso del propio día 1 que el tercero, cinco días después.
 */
export async function sendCheckinReminder(
  to: string,
  aviso?: { subject: string; heading: string; message: string }
): Promise<void> {
  const a = aviso ?? {
    subject: "📸 Toca tu revisión",
    heading: "Toca tu revisión 📸",
    message: "Sube tu peso y tus 3 fotos (frente, perfil y espaldas) para seguir tu progreso.",
  };
  const url = `${SITE_URL}/miembros/checkins`;
  const text = `${a.message}\n\nHazla aquí: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">${escapeHtml(a.heading)}</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 24px;font-size:15px;">${escapeHtml(a.message)}</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Hacer mi revisión</a>
    </div>
  </div>`;
  await send({ to, subject: a.subject, html, text });
}

/**
 * Se acabó el plazo de espera que la clienta eligió en el Anexo II-A: hoy
 * empieza su programa de verdad.
 */
export async function sendEsperaTerminada(to: string): Promise<void> {
  const url = MEMBER_AREA_URL;
  const subject = "🚀 Hoy empieza tu programa";
  const text = `Se han cumplido los catorce días que elegiste esperar. Tu área ya está abierta: ${url}`;
  const html = `
  <div style="background:#0A0A0A;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="font-weight:900;font-size:20px;margin:0 0 24px;">fit<span style="color:#1CA0E3;">con</span>aurena</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;">Hoy empieza tu programa 🚀</h1>
      <p style="color:#A0A0A0;line-height:1.6;margin:0 0 24px;font-size:15px;">Se han cumplido los catorce días que elegiste esperar antes de comenzar. Tu área ya está abierta: entra y empezamos.</p>
      <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Entrar a mi área</a>
    </div>
  </div>`;
  await send({ to, subject, html, text });
}

/** Avisa a la coach en cuanto una clienta sube su revisión. */
export async function sendCheckinDoneNotice(to: string[], quien: string, quincena: string): Promise<void> {
  const url = `${SITE_URL}/miembros/checkins`;
  const subject = `✅ ${quien} ha subido su revisión`;
  const text = `${quien} acaba de subir su revisión del ${quincena}.\n\nVerla: ${url}`;
  const html = `
  <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0A0A0A;padding:24px;max-width:520px;margin:0 auto;">
    <h2 style="margin:0 0 8px;">Revisión subida ✅</h2>
    <p style="font-size:14px;line-height:1.5;"><strong>${escapeHtml(quien)}</strong> acaba de subir su revisión del ${escapeHtml(quincena)}.</p>
    <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:8px;">Ver la revisión</a>
  </div>`;
  await send({ to, subject, html, text });
}

/**
 * Parte para la coach: quién ha hecho la revisión de la quincena y quién no.
 * Las que faltan van primero, que es lo que hay que mirar.
 */
export async function sendCheckinReport(
  to: string[],
  quincena: string,
  hechas: string[],
  faltan: string[]
): Promise<void> {
  const url = `${SITE_URL}/miembros/checkins`;
  const total = hechas.length + faltan.length;
  const subject = faltan.length === 0
    ? `✅ Revisión del ${quincena}: las ${total} hechas`
    : `⏳ Revisión del ${quincena}: faltan ${faltan.length} de ${total}`;

  const lista = (nombres: string[]) =>
    nombres.length === 0
      ? `<p style="font-size:14px;color:#666;margin:0 0 16px;">Ninguna.</p>`
      : `<ul style="font-size:14px;line-height:1.7;margin:0 0 16px;padding-left:20px;">${nombres.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`;

  const text =
    `Revisión del ${quincena} — ${hechas.length} de ${total} hechas.\n\n` +
    `SIN HACER (${faltan.length}):\n${faltan.map((n) => `  · ${n}`).join("\n") || "  ninguna"}\n\n` +
    `Hechas (${hechas.length}):\n${hechas.map((n) => `  · ${n}`).join("\n") || "  ninguna"}\n\n${url}`;

  const html = `
  <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0A0A0A;padding:24px;max-width:520px;margin:0 auto;">
    <h2 style="margin:0 0 4px;">Revisión del ${escapeHtml(quincena)}</h2>
    <p style="font-size:14px;color:#666;margin:0 0 20px;">${hechas.length} de ${total} hechas.</p>
    <h3 style="font-size:15px;margin:0 0 6px;">Sin hacer (${faltan.length})</h3>
    ${lista(faltan)}
    <h3 style="font-size:15px;margin:0 0 6px;">Hechas (${hechas.length})</h3>
    ${lista(hechas)}
    <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:8px;">Ver las revisiones</a>
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

/**
 * Avisa a la coach de que hay una duda nueva en el buzón anónimo.
 *
 * El correo NO incluye el texto de la duda a propósito: es contenido sensible
 * (comida, cabeza, cuerpo) y el buzón promete anonimato. Se avisa de que hay
 * algo nuevo y se entra a leerlo al área privada.
 */
export async function sendDudaNotice(to: string[], categoria: string, privada: boolean): Promise<void> {
  const url = `${SITE_URL}/miembros/dudas`;
  const subject = privada ? "🔒 Una clienta te pide respuesta en privado" : "💬 Nueva duda en el buzón anónimo";
  const intro = privada
    ? `Una clienta ha dejado una consulta sobre ${categoria} y ha pedido que le respondas en privado.`
    : `Hay una duda nueva sobre ${categoria} en el buzón anónimo.`;
  const text = `${intro}\n\nLéela en tu área: ${url}`;
  const html = `
  <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0A0A0A;padding:24px;max-width:520px;margin:0 auto;">
    <h2 style="margin:0 0 8px;">${privada ? "Consulta privada 🔒" : "Nueva duda 💬"}</h2>
    <p style="font-size:14px;line-height:1.5;">${escapeHtml(intro)}</p>
    <a href="${url}" style="display:inline-block;background:#1CA0E3;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:8px;">Leer la duda</a>
  </div>`;
  await send({ to, subject, html, text });
}
