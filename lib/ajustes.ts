import { sbSelect, sbUpsert } from "@/lib/supabase";
import { MEMBER_AREA_URL } from "@/lib/config";

/**
 * Ajustes que la coach cambia desde su Panel (tabla app_settings).
 *
 * El enlace de la sala de la videollamada vivía en una variable de Vercel:
 * cada vez que cambiaba la reunión de Zoom había que entrar en Vercel y
 * volver a desplegar. Ahora se guarda aquí; la variable queda como respaldo
 * por si la tabla aún no existe o está vacía.
 */
export const AJUSTE_SALA = "call_url";

export async function leerAjuste(key: string): Promise<string | null> {
  try {
    const rows = await sbSelect<{ value: string | null }>("app_settings", `select=value&key=eq.${encodeURIComponent(key)}`);
    const v = rows[0]?.value?.trim();
    return v ? v : null;
  } catch (e) {
    console.error("[ajustes] leer", key, e);
    return null;
  }
}

export async function guardarAjuste(key: string, value: string | null, por: string): Promise<void> {
  await sbUpsert("app_settings", { key, value, updated_by: por, updated_at: new Date().toISOString() });
}

/** Enlace de la sala de la videollamada: el guardado por la coach, si no la
 * variable de entorno, y si no el área de miembros (nunca un enlace roto). */
export async function enlaceSala(): Promise<string> {
  return (await leerAjuste(AJUSTE_SALA)) ?? process.env.CALL_URL ?? process.env.NEXT_PUBLIC_CALL_URL ?? MEMBER_AREA_URL;
}
