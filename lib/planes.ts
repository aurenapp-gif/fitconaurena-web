/**
 * Leer el plan que la coach subió y convertirlo en datos.
 *
 * Los planes son archivos: un PDF, una foto de una hoja, a veces un Word. Para
 * que la app pueda enseñar «hoy te tocan 120 g de arroz» o «sentadilla, 4×8»,
 * y para que FitAI pueda responder a eso, hay que leerlos.
 *
 * Se hace UNA vez por plan y se guarda en la propia fila (`plans.estructura` y
 * `plans.contenido`). El plan no cambia: cuando la coach sube uno nuevo, es
 * una fila nueva con su propia lectura. Así nadie paga dos veces por lo mismo
 * y, sobre todo, el plan de una clienta no puede acabar en la pantalla de otra.
 *
 * Si algo falla —archivo enorme, Word, foto ilegible— se devuelve null y la
 * app sigue con el PDF de siempre. Un plan mal leído es peor que uno sin leer.
 */

import Anthropic from "@anthropic-ai/sdk";
import { sbDownload, sbUpdate } from "@/lib/supabase";
import {
  ESQUEMA_ENTRENAMIENTO, ESQUEMA_NUTRICION,
  INSTRUCCION_ENTRENAMIENTO, INSTRUCCION_NUTRICION,
  normaliza, textoDeEstructura, type Estructura,
} from "@/lib/plan-estructura";

/**
 * Leer un plan es copiar números que una persona se va a comer o levantar. Un
 * «120» donde ponía «220» no se nota hasta que es tarde, así que aquí no se
 * ahorra en modelo.
 */
const MODELO_LECTURA = "claude-opus-5";

/**
 * Tope de tamaño. El archivo viaja a la API en base64, que abulta un tercio
 * más. Un plan normal pesa unos cientos de kilobytes; los que se pasan suelen
 * ser fotos sin comprimir.
 */
export const MAX_BYTES_PLAN = 8 * 1024 * 1024;

/** Lo que se guarda como mucho en texto. De sobra para un plan de un mes. */
export const MAX_CONTENIDO = 12000;

/**
 * Si las columnas todavía no existen (falta ejecutar supabase/planes.sql),
 * guardar falla y el plan se releería en CADA pregunta, que es dinero tirado.
 * Al primer fallo se deja de intentar en esta instancia.
 */
let sePuedeGuardar = true;

export type PlanLeible = {
  id: string;
  type: string;
  file_path: string | null;
  contenido?: string | null;
  estructura?: unknown;
};

export type PlanLeido = {
  /** El plan en datos, si se ha podido entender. */
  estructura: Estructura | null;
  /** El mismo plan en texto, que es lo que lee FitAI. */
  texto: string | null;
};

const VACIO: PlanLeido = { estructura: null, texto: null };

type Formato = { clase: "pdf" } | { clase: "imagen"; medio: "image/jpeg" | "image/png" | "image/webp" | "image/gif" } | null;

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

/** Lo ya guardado, si la lectura se hizo en su día. */
function guardado(plan: PlanLeible): PlanLeido | null {
  const e = plan.estructura;
  if (e && typeof e === "object") {
    const tipo = plan.type === "nutricion" ? "nutricion" : "entrenamiento";
    const est = normaliza(tipo, e);
    if (est) return { estructura: est, texto: plan.contenido || textoDeEstructura(est) };
  }
  // Planes leídos antes de que existiera la estructura: al menos tienen texto.
  return plan.contenido ? { estructura: null, texto: plan.contenido } : null;
}

/**
 * El plan en datos, leyéndolo la primera vez y reutilizándolo después.
 */
export async function leerPlan(plan: PlanLeible): Promise<PlanLeido> {
  const ya = guardado(plan);
  if (ya) return ya;

  if (!plan.file_path || !process.env.ANTHROPIC_API_KEY) return VACIO;
  const formato = formatoDe(plan.file_path);
  if (!formato) return VACIO;

  const tipo = plan.type === "nutricion" ? "nutricion" : "entrenamiento";

  try {
    const bytes = await sbDownload("planes", plan.file_path);
    if (bytes.byteLength > MAX_BYTES_PLAN) {
      console.error(`[planes] ${plan.id} pesa ${bytes.byteLength} bytes, no se lee`);
      return VACIO;
    }
    const datos = Buffer.from(bytes).toString("base64");

    const adjunto: Anthropic.ContentBlockParam =
      formato.clase === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: datos } }
        : { type: "image", source: { type: "base64", media_type: formato.medio, data: datos } };

    const client = new Anthropic();
    // Con streaming: un plan largo puede tardar y pasarse del tiempo de una
    // petición normal.
    const stream = client.messages.stream({
      model: MODELO_LECTURA,
      max_tokens: 32000,
      output_config: {
        format: {
          type: "json_schema",
          schema: tipo === "nutricion" ? ESQUEMA_NUTRICION : ESQUEMA_ENTRENAMIENTO,
        },
      },
      messages: [{
        role: "user",
        content: [adjunto, { type: "text", text: tipo === "nutricion" ? INSTRUCCION_NUTRICION : INSTRUCCION_ENTRENAMIENTO }],
      }],
    });
    const res = await stream.finalMessage();

    if (res.stop_reason === "refusal") {
      console.error(`[planes] ${plan.id}: la lectura fue rechazada`);
      return VACIO;
    }
    const crudo = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (!crudo) return VACIO;

    let bruto: unknown;
    try { bruto = JSON.parse(crudo); } catch {
      console.error(`[planes] ${plan.id}: la respuesta no era JSON`);
      return VACIO;
    }

    const estructura = normaliza(tipo, bruto);
    if (!estructura) {
      console.error(`[planes] ${plan.id}: ilegible o vacío`);
      return VACIO;
    }
    const texto = textoDeEstructura(estructura).slice(0, MAX_CONTENIDO);

    if (sePuedeGuardar) {
      await sbUpdate("plans", `id=eq.${encodeURIComponent(plan.id)}`, {
        estructura,
        contenido: texto,
        contenido_at: new Date().toISOString(),
      }).catch((e) => {
        sePuedeGuardar = false;
        console.error("[planes] no se pudo guardar la lectura; ¿falta supabase/planes.sql?", e);
      });
    }

    return { estructura, texto };
  } catch (e) {
    console.error(`[planes] no se pudo leer ${plan.id}`, e);
    return VACIO;
  }
}
