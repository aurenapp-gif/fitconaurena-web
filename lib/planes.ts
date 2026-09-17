/**
 * Leer el plan que la coach subió.
 *
 * Los planes son archivos: un PDF, una foto de una hoja, a veces un Word. Para
 * que FitAI pueda responder «¿cuánto arroz me toca en la comida?» hay que
 * convertir ese archivo en texto.
 *
 * Se hace UNA vez por plan y se guarda en la propia fila (`plans.contenido`).
 * Transcribir en cada pregunta costaría dinero y segundos cada vez, y el plan
 * no cambia: cuando la coach sube uno nuevo, es una fila nueva.
 *
 * Si algo falla —archivo enorme, formato raro, la columna todavía no existe—
 * se devuelve null y FitAI sigue funcionando con el resto: sabe que tiene un
 * plan y de cuándo es, pero no lo que pone dentro. Nunca se rompe la respuesta
 * por esto.
 */

import Anthropic from "@anthropic-ai/sdk";
import { sbDownload, sbUpdate } from "@/lib/supabase";

/** Transcribir es copiar, no razonar: el modelo pequeño va sobrado y es barato. */
const MODELO_LECTURA = "claude-haiku-4-5-20251001";

/**
 * Tope de tamaño. El archivo viaja a la API en base64, que abulta un tercio
 * más, y por encima de esto la petición empieza a ser un problema. Un plan
 * normal pesa unos cientos de kilobytes; los que se pasan suelen ser fotos sin
 * comprimir.
 */
export const MAX_BYTES_PLAN = 8 * 1024 * 1024;

/** Lo que se guarda como mucho. De sobra para un plan de un mes. */
export const MAX_CONTENIDO = 8000;

/**
 * Si la columna `contenido` todavía no existe (falta ejecutar
 * supabase/fitai.sql), guardar falla y el plan se volvería a transcribir en
 * CADA pregunta, que es dinero tirado. Al primer fallo se deja de intentar en
 * esta instancia y se sigue leyendo sin guardar.
 */
let sePuedeGuardar = true;

export type PlanLeible = {
  id: string;
  type: string;
  file_path: string | null;
  contenido?: string | null;
};

type Formato = { clase: "pdf" } | { clase: "imagen"; medio: string } | null;

/** Qué es el archivo, por su extensión. Word y demás se quedan fuera. */
function formatoDe(path: string): Formato {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return { clase: "pdf" };
  if (ext === "jpg" || ext === "jpeg") return { clase: "imagen", medio: "image/jpeg" };
  if (ext === "png") return { clase: "imagen", medio: "image/png" };
  if (ext === "webp") return { clase: "imagen", medio: "image/webp" };
  if (ext === "gif") return { clase: "imagen", medio: "image/gif" };
  return null;
}

const INSTRUCCION = `Transcribe este plan a texto plano, entero y sin resumir.

Mantén las cantidades exactas (gramos, mililitros, piezas), las series, las repeticiones, los descansos y los nombres tal y como están escritos. Respeta la estructura: días, comidas, bloques de entrenamiento.

No añadas comentarios, consejos ni interpretaciones tuyas. No corrijas nada aunque te parezca un error. Solo transcribe lo que hay.

Si el archivo no se lee bien o no es un plan, responde únicamente: NO_LEGIBLE`;

/**
 * El texto del plan, transcribiéndolo la primera vez y reutilizándolo después.
 *
 * `guardar: false` sirve para el momento de la subida, donde interesa no
 * escribir dos veces la misma fila.
 */
export async function leerPlan(plan: PlanLeible): Promise<string | null> {
  if (plan.contenido) return plan.contenido;
  if (!plan.file_path) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const formato = formatoDe(plan.file_path);
  if (!formato) return null;

  try {
    const bytes = await sbDownload("planes", plan.file_path);
    if (bytes.byteLength > MAX_BYTES_PLAN) {
      console.error(`[planes] ${plan.id} pesa ${bytes.byteLength} bytes, no se transcribe`);
      return null;
    }
    const datos = Buffer.from(bytes).toString("base64");

    const adjunto: Anthropic.ContentBlockParam =
      formato.clase === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: datos } }
        : { type: "image", source: { type: "base64", media_type: formato.medio as "image/jpeg", data: datos } };

    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODELO_LECTURA,
      max_tokens: 8000,
      messages: [{ role: "user", content: [adjunto, { type: "text", text: INSTRUCCION }] }],
    });

    const texto = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .slice(0, MAX_CONTENIDO);

    if (!texto || texto.includes("NO_LEGIBLE")) return null;

    // Se guarda para no volver a pagarlo.
    if (sePuedeGuardar) {
      await sbUpdate("plans", `id=eq.${encodeURIComponent(plan.id)}`, {
        contenido: texto,
        contenido_at: new Date().toISOString(),
      }).catch((e) => {
        sePuedeGuardar = false;
        console.error("[planes] no se pudo guardar el contenido; ¿falta supabase/fitai.sql?", e);
      });
    }

    return texto;
  } catch (e) {
    console.error(`[planes] no se pudo leer ${plan.id}`, e);
    return null;
  }
}
