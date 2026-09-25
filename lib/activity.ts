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
  bienvenida: "Se le ha dado la bienvenida",
} as const;

export type Action = keyof typeof ACTIONS;

/**
 * Las que NO puede mandar el navegador.
 *
 * «bienvenida» no es algo que haga ella: es la marca de que ya se le mandó el
 * correo de bienvenida, y por eso decide que no se vuelva a mandar. Si se
 * admitiera desde fuera, cualquiera podría apuntarla antes de tiempo y dejar
 * a una clienta sin su bienvenida.
 */
const SOLO_SERVIDOR: ReadonlySet<string> = new Set<Action>(["bienvenida"]);

/** ¿Es una acción que puede apuntar la propia clienta desde su navegador? */
export function isAction(v: unknown): v is Action {
  return typeof v === "string"
    && Object.prototype.hasOwnProperty.call(ACTIONS, v)
    && !SOLO_SERVIDOR.has(v);
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
