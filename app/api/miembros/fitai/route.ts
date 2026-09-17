import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, adminEmails } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { rateLimit } from "@/lib/ratelimit";
import { sbInsert, sbSelect } from "@/lib/supabase";
import { contexto, sistemaEstable, pareceDerivada, LIMITE_HORA, MAX_HISTORIAL, MAX_PREGUNTA } from "@/lib/fitai";
import { datosDe } from "@/lib/clienta";
import { leerPlan } from "@/lib/planes";
import { periodoDe, proximaRevision, todayMadrid } from "@/lib/revisiones";
import { diaDe, fechaCorta, hoyMadrid, renovacionAlimentacion, renovacionEntrenamiento } from "@/lib/renovaciones";
import { litros, pasos as textoPasos, pauta, type Supplement } from "@/lib/suplementos";
import { nombresDe } from "@/lib/entreno";
import { rachaDias } from "@/lib/habitos";
import { edadDe, type Questionnaire } from "@/lib/profile";
import { MEDIDAS } from "@/lib/progreso";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELO = "claude-opus-5";

export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[fitai] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "FitAI todavía no está configurado. Díselo a tu coach." }, { status: 503 });
  }
  if (!rateLimit(`fitai:${email}`, LIMITE_HORA, 3600_000)) {
    return NextResponse.json({ error: "Has preguntado mucho seguido. Prueba dentro de un rato." }, { status: 429 });
  }

  let body: { mensajes?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  // Solo se aceptan los dos roles de una conversación y texto plano: nada de
  // bloques de contenido montados desde el navegador.
  const crudos = Array.isArray(body.mensajes) ? body.mensajes : [];
  const mensajes: Anthropic.MessageParam[] = [];
  for (const m of crudos.slice(-MAX_HISTORIAL)) {
    const o = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    const rol = o.role === "assistant" ? "assistant" : "user";
    const texto = typeof o.content === "string" ? o.content.trim().slice(0, MAX_PREGUNTA) : "";
    if (texto) mensajes.push({ role: rol, content: texto });
  }
  while (mensajes.length && mensajes[0].role === "assistant") mensajes.shift();
  const ultima = mensajes[mensajes.length - 1];
  if (!ultima || ultima.role !== "user") {
    return NextResponse.json({ error: "Escribe tu pregunta." }, { status: 400 });
  }
  const pregunta = String(ultima.content);

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
      // Pregunta corta, respuesta corta: no hace falta que se lo piense mucho.
      // Con el pensamiento apagado del todo, Opus 5 a veces cuela etiquetas
      // internas en la respuesta, así que se baja el esfuerzo en su lugar.
      output_config: { effort: "low" },
      system: [
        // Lo que no cambia va primero y cacheado: se paga una vez y las demás
        // preguntas salen mucho más baratas.
        { type: "text", text: sistemaEstable(coach), cache_control: { type: "ephemeral" } },
        // El bloque de la clienta también se cachea desde que lleva dentro su
        // plan entero. Cambia con cada una, pero dentro de una conversación se
        // repite en cada pregunta, que es donde se nota.
        { type: "text", text: contexto(datos), cache_control: { type: "ephemeral" } },
      ],
      messages: mensajes,
    });
  } catch (err) {
    console.error("[fitai] no se pudo empezar", err);
    return NextResponse.json({ error: "No se ha podido responder ahora mismo. Inténtalo en un momento." }, { status: 502 });
  }

  // Se va mandando la respuesta según se escribe, y al terminar se guarda para
  // que la coach vea qué le preguntan.
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
          const aviso = "Prefiero no responder a eso. Si es algo del programa, díselo a tu coach y te lo resuelve.";
          completa = aviso;
          controller.enqueue(encoder.encode(aviso));
        }
      } catch (err) {
        console.error("[fitai] error a mitad", err);
        const aviso = "\n\nSe me ha cortado la respuesta. Vuelve a preguntármelo, por favor.";
        controller.enqueue(encoder.encode(aviso));
        // Nadie se queda mirando una burbuja vacía. Si el modelo no ha
        // escrito nada —pasa cuando algo se tuerce por detrás— se dice, y se
        // dice de forma que ella sepa qué hacer.
        if (!completa.trim()) {
          const aviso = "Se me ha quedado la cabeza en blanco. Vuelve a preguntármelo, por favor.";
          completa = aviso;
          controller.enqueue(encoder.encode(aviso));
        }
      } finally {
        await sbInsert("fitai_messages", {
          member_email: email,
          question: pregunta,
          answer: completa || null,
          derivada: pareceDerivada(completa, coach),
        }).catch((e) => console.error("[fitai] registro", e));
        controller.close();
      }
    },
  });

  return new Response(salida, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
