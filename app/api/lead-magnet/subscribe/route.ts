import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILERLITE_ENDPOINT = "https://connect.mailerlite.com/api/subscribers";

type RequestBody = {
  email?: unknown;
  website?: unknown;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Petición inválida." },
      { status: 400 }
    );
  }

  // Honeypot: if filled, pretend success without calling MailerLite.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, alreadyActive: false });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Introduce un email válido." },
      { status: 400 }
    );
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;

  if (!apiKey || !groupId) {
    console.error("[lead-magnet] Missing MAILERLITE_API_KEY or MAILERLITE_GROUP_ID");
    return NextResponse.json(
      { ok: false, message: "El servicio no está disponible ahora mismo." },
      { status: 500 }
    );
  }

  try {
    const mlRes = await fetch(MAILERLITE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        groups: [groupId],
        status: "unconfirmed",
      }),
    });

    const data = (await mlRes.json().catch(() => null)) as
      | { data?: { status?: string } }
      | null;

    if (!mlRes.ok) {
      console.error("[lead-magnet] MailerLite error", mlRes.status, data);
      return NextResponse.json(
        {
          ok: false,
          message:
            "No hemos podido procesar tu email. Inténtalo de nuevo en unos minutos.",
        },
        { status: 502 }
      );
    }

    const alreadyActive = data?.data?.status === "active";

    return NextResponse.json({ ok: true, alreadyActive });
  } catch (err) {
    console.error("[lead-magnet] Unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "No hemos podido procesar tu email. Inténtalo de nuevo en unos minutos.",
      },
      { status: 500 }
    );
  }
}
