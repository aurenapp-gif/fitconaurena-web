import { sbInsert } from "@/lib/supabase";

/** Acciones que se registran. Lista cerrada: lo que llega del navegador se
 * valida contra ella, para que nadie pueda inventarse eventos en el historial. */
export const ACTIONS = {
  acceso: "Ha entrado en la plataforma",
  plan_abierto: "Ha abierto un plan",
  plan_descargado: "Ha descargado un plan",
  contrato_abierto: "Ha abierto el contrato",
  herramienta_abierta: "Ha usado una herramienta",
  llamada_abierta: "Ha visto su llamada estratégica",
} as const;

export type Action = keyof typeof ACTIONS;

export function isAction(v: unknown): v is Action {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ACTIONS, v);
}

/**
 * Deja constancia de una acción de la clienta.
 *
 * Nunca lanza: registrar el uso no puede tumbar la operación que lo provoca
 * (entrar, abrir un plan…). Si la tabla aún no existe o Supabase falla, se
 * pierde ese apunte y punto.
 */
export async function logActivity(memberEmail: string, action: Action, detail?: string): Promise<void> {
  try {
    await sbInsert("activity_log", {
      member_email: memberEmail,
      action,
      detail: detail?.slice(0, 120) ?? null,
    });
  } catch (e) {
    console.error("[activity]", action, e);
  }
}
