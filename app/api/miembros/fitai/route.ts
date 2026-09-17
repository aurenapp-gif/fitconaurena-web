import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, adminEmails } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { rateLimit } from "@/lib/ratelimit";
import { sbInsert, sbSelect } from "@/lib/supabase";
import { contexto, sistemaEstable, pareceDerivada, LIMITE_HORA, MAX_HISTORIAL, MAX_PREGUNTA, type ContextoClienta } from "@/lib/fitai";
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

type Plan = {
  id: string;
  type: "nutricion" | "entrenamiento";
  title: string | null;
  note: string | null;
  file_path: string | null;
  contenido?: string | null;
  estructura?: unknown;
  semanas?: number | null;
  created_at: string;
  exercises?: unknown;
};
type Revision = Record<string, unknown> & {
  created_at: string;
  note: string | null;
  coach_reply: string | null;
};

/** Texto de una respuesta del cuestionario, recortado y sin vacíos. */
function campo(q: Questionnaire | null, id: string, max = 300): string | null {
  const v = q?.[id];
  const t = typeof v === "string" ? v.trim() : "";
  return t && t.toLowerCase() !== "no" && t.toLowerCase() !== "ninguna" ? t.slice(0, max) : null;
}

/**
 * Cómo va de medidas: la última y cuánto ha cambiado desde la anterior. Es lo
 * que le permite decir «llevas tres centímetros menos de cintura» en vez de
 * «vas progresando bien».
 */
function comparaMedidas(revisiones: Revision[]): string[] {
  const [ahora, antes] = revisiones;
  if (!ahora) return [];
  const out: string[] = [];
  for (const m of MEDIDAS) {
    const v = Number(ahora[m.key]);
    if (!Number.isFinite(v) || v <= 0) continue;
    const p = antes ? Number(antes[m.key]) : NaN;
    const delta = Number.isFinite(p) && p > 0 ? v - p : null;
    const signo = delta === null || Math.abs(delta) < 0.05
      ? ""
      : ` (${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1).replace(".", ",")} desde la anterior)`;
    out.push(`${m.label} ${v.toLocaleString("es-ES")} ${m.unidad}${signo}`);
  }
  return out;
}

/**
 * El contexto de la clienta se arma AQUÍ, en el servidor, a partir de la
 * sesión. Nunca llega del navegador: si viniera de ahí, cualquiera podría
 * pedirle a FitAI que hablara de los datos de otra.
 */
async function datosDe(email: string): Promise<ContextoClienta> {
  const e = encodeURIComponent(email);
  const hoy = todayMadrid();
  const [perfil, planes, revisiones, suplementos, dias] = await Promise.all([
    sbSelect<{
      display_name: string | null; created_at: string | null;
      water_target_l: number | null; steps_target: number | null;
      questionnaire: Questionnaire | null;
    }>("profiles", `select=display_name,created_at,water_target_l,steps_target,questionnaire&email=eq.${e}`)
      .then((r) => r[0] ?? null).catch(() => null),
    // Las columnas de la lectura pueden no existir todavía (falta ejecutar
    // supabase/planes.sql). PostgREST devuelve 400, así que se reintenta sin
    // ellas: FitAI responde igual, solo sin el detalle del plan.
    sbSelect<Plan>("plans", `select=id,type,title,note,file_path,contenido,estructura,semanas,created_at,exercises&member_email=eq.${e}&order=created_at.desc&limit=20`)
      .catch(() => sbSelect<Plan>("plans", `select=id,type,title,note,file_path,created_at,exercises&member_email=eq.${e}&order=created_at.desc&limit=20`)
        .catch(() => [] as Plan[])),
    sbSelect<Revision>("check_ins", `select=*&member_email=eq.${e}&order=created_at.desc&limit=4`).catch(() => [] as Revision[]),
    sbSelect<Supplement>("member_supplements", `select=*&member_email=eq.${e}&order=created_at.asc`).catch(() => [] as Supplement[]),
    sbSelect<{ day: string }>("habit_logs", `select=day&member_email=eq.${e}`).catch(() => [] as { day: string }[]),
  ]);

  const q = perfil?.questionnaire ?? null;
  const nut = planes.find((p) => p.type === "nutricion") ?? null;
  const ent = planes.find((p) => p.type === "entrenamiento") ?? null;
  const renNut = renovacionAlimentacion(nut ? diaDe(nut.created_at) : null, hoyMadrid());
  const renEnt = renovacionEntrenamiento(ent ? diaDe(ent.created_at) : null, hoyMadrid(), ent?.semanas ?? null);
  const ultima = revisiones[0] ?? null;
  const hecha = !!ultima && diaDe(ultima.created_at) >= periodoDe(hoy).inicio;
  const prox = proximaRevision(hoy, hecha);

  // Los dos planes se leen a la vez; si uno falla, el otro sigue.
  const [leidoNut, leidoEnt] = await Promise.all([
    nut ? leerPlan(nut).catch(() => null) : Promise.resolve(null),
    ent ? leerPlan(ent).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    nombre: perfil?.display_name || email.split("@")[0],
    edad: edadDe(campo(q, "fecha_nacimiento", 10)),
    desde: perfil?.created_at ? fechaCorta(diaDe(perfil.created_at)) : null,
    objetivo: campo(q, "objetivo"),
    experiencia: campo(q, "experiencia"),
    diasEntreno: campo(q, "dias_entreno"),
    lugarEntreno: campo(q, "lugar_entreno"),
    comidasDia: campo(q, "comidas_dia"),
    lesiones: campo(q, "lesiones", 600),
    alergias: campo(q, "alergias", 600),
    evitar: campo(q, "alimentos_evitar", 600),
    ciclo: campo(q, "ciclo"),
    notasAlta: campo(q, "notas", 600),
    proximaRevision: fechaCorta(prox.fecha),
    revisionPendiente: prox.pendiente,
    ultimaRevision: ultima ? fechaCorta(diaDe(ultima.created_at)) : null,
    medidas: comparaMedidas(revisiones),
    notaClienta: ultima?.note?.trim().slice(0, 600) || null,
    respuestasCoach: revisiones
      .map((r) => r.coach_reply?.trim())
      .filter((r): r is string => !!r)
      .slice(0, 3)
      .map((r) => r.slice(0, 700)),
    planNutricion: nut ? `${nut.title?.trim() || "sin título"}, subido el ${fechaCorta(diaDe(nut.created_at))}${renNut.toca ? `; se renueva el ${fechaCorta(renNut.toca)}` : ""}` : null,
    notaNutricion: nut?.note?.trim().slice(0, 800) || null,
    contenidoNutricion: leidoNut?.texto ?? null,
    planEntrenamiento: ent ? `${ent.title?.trim() || "sin título"}, subido el ${fechaCorta(diaDe(ent.created_at))}${renEnt.toca ? `; vigente hasta el ${fechaCorta(renEnt.toca)}` : ""}` : null,
    notaEntrenamiento: ent?.note?.trim().slice(0, 800) || null,
    contenidoEntrenamiento: leidoEnt?.texto ?? null,
    ejercicios: nombresDe(ent?.exercises),
    agua: perfil?.water_target_l != null ? litros(perfil.water_target_l) : null,
    pasos: perfil?.steps_target != null ? textoPasos(perfil.steps_target) : null,
    racha: rachaDias(new Set(dias.map((d) => d.day)), hoy) || null,
    suplementos: suplementos.map((s) => `${s.name}${pauta(s) ? ` (${pauta(s)})` : ""}`),
  };
}

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
