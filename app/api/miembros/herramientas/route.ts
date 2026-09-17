import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, adminEmails } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { rateLimit } from "@/lib/ratelimit";
import { sbInsert, sbSelect } from "@/lib/supabase";
import { contexto } from "@/lib/fitai";
import { datosDe } from "@/lib/clienta";
import { buscaHerramienta, comun, LIMITE_HORA, MAX_NOTA } from "@/lib/herramientas";
import { validateUpload } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELO = "claude-opus-5";
/** Las fotos llegan ya reducidas desde el navegador; esto es la red de abajo. */
const MAX_BYTES = 6 * 1024 * 1024;

const MEDIOS: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  "image/jpeg": "image/jpeg", "image/jpg": "image/jpeg",
  "image/png": "image/png", "image/webp": "image/webp", "image/gif": "image/gif",
};

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[herramientas] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "Las herramientas todavía no están configuradas. Díselo a tu coach." }, { status: 503 });
  }
  if (!rateLimit(`herramientas:${email}`, LIMITE_HORA, 3600_000)) {
    return NextResponse.json({ error: "Has mandado muchas fotos seguidas. Prueba dentro de un rato." }, { status: 429 });
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const herramienta = buscaHerramienta(String(form.get("herramienta") ?? ""));
  if (!herramienta) return NextResponse.json({ error: "Esa herramienta no existe." }, { status: 400 });

  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json({ error: "Añade una foto." }, { status: 400 });
  }
  const invalido = validateUpload(foto, "image");
  if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
  if (foto.size > MAX_BYTES) {
    return NextResponse.json({ error: "Esa foto pesa demasiado. Hazla otra vez con menos calidad." }, { status: 400 });
  }
  const medio = MEDIOS[(foto.type || "").toLowerCase()];
  if (!medio) return NextResponse.json({ error: "Ese formato de imagen no vale. Usa una foto normal." }, { status: 400 });

  const nota = String(form.get("nota") ?? "").trim().slice(0, MAX_NOTA);

  const coach = (await sbSelect<{ display_name: string | null }>(
    "profiles", `select=display_name&email=eq.${encodeURIComponent(adminEmails()[0] ?? "")}`
  ).then((r) => r[0]?.display_name ?? null).catch(() => null)) || "tu coach";

  const datos = await datosDe(email);
  const client = new Anthropic();

  let stream;
  try {
    stream = client.beta.messages.stream({
      model: MODELO,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      max_tokens: 8000,
      output_config: { effort: "low" },
      system: [
        // Lo estable primero y cacheado; lo de ella después.
        { type: "text", text: `${comun(coach)}\n\n# Esta herramienta: ${herramienta.name}\n\n${herramienta.instrucciones}`, cache_control: { type: "ephemeral" } },
        { type: "text", text: contexto(datos), cache_control: { type: "ephemeral" } },
      ],
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: medio, data: Buffer.from(await foto.arrayBuffer()).toString("base64") } },
          { type: "text", text: nota || "Dime qué hago con esto." },
        ],
      }],
    });
  } catch (err) {
    console.error("[herramientas] no se pudo empezar", err);
    return NextResponse.json({ error: "No se ha podido mirar la foto ahora mismo. Inténtalo en un momento." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const salida = new ReadableStream<Uint8Array>({
    async start(controller) {
      let completa = "";
      try {
        for await (const evento of stream) {
          if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
            completa += evento.delta.text;
            controller.enqueue(encoder.encode(evento.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          const aviso = "Prefiero no responder a esta foto. Si es algo del programa, díselo a tu coach.";
          completa = aviso;
          controller.enqueue(encoder.encode(aviso));
        }
      } catch (err) {
        console.error("[herramientas] error a mitad", err);
        controller.enqueue(encoder.encode("\n\nSe me ha cortado. Vuelve a mandarme la foto, por favor."));
      } finally {
        if (!completa.trim()) {
          const aviso = "No he sacado nada en claro de esa foto. Prueba con otra donde se vea mejor.";
          completa = aviso;
          controller.enqueue(encoder.encode(aviso));
        }
        // Se registra para que la coach vea qué le están preguntando, igual que
        // con FitAI. La foto NO se guarda: no hace falta para eso.
        await sbInsert("fitai_messages", {
          member_email: email,
          question: `[${herramienta.name}] ${nota || "(solo la foto)"}`,
          answer: completa,
          derivada: false,
        }).catch((e) => console.error("[herramientas] registro", e));
        controller.close();
      }
    },
  });

  return new Response(salida, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
