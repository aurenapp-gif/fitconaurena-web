/**
 * El equipo: entrenadores y nutricionistas que trabajan con las clientas.
 *
 * Tres papeles en la app, y la diferencia importa:
 *
 *  - CEO (ADMIN_EMAILS, variable de entorno): lo ve todo. Es quien manda, y
 *    vive en una variable y no en la base de datos a propósito: un fallo de
 *    Supabase, o alguien tocando una tabla, no pueden dejarle fuera de su
 *    propia empresa ni meter a nadie en su sitio.
 *  - Equipo (esta tabla): ve y gestiona a las clientas, sube planificaciones,
 *    contesta revisiones y dudas. No ve el dinero, ni los contratos firmados,
 *    ni los ajustes de la plataforma, y no puede borrar nada.
 *  - Clienta: lo suyo.
 *
 * Lo que el equipo NO puede hacer se decide por omisión: toda pantalla que no
 * se haya abierto a propósito sigue siendo solo del CEO. Es la única forma de
 * que añadir una pantalla nueva mañana no la exponga sin querer.
 */

import { isAdmin } from "./members";
import { sbSelect } from "./supabase";

export type DelEquipo = {
  email: string;
  nombre: string | null;
  /** «Entrenador», «Nutricionista»… Solo para enseñarlo; no cambia permisos. */
  puesto: string | null;
  activo: boolean;
};

export type Rol = "ceo" | "equipo" | "clienta";

/** Cuánto se guarda la lista en memoria. El equipo cambia una vez al mes, no
 * cada visita, y esto se consulta en CADA página de miembro. */
const TTL_MS = 60_000;
let cache: { cuando: number; emails: Set<string> } | null = null;

async function emailsDelEquipo(): Promise<Set<string>> {
  if (cache && Date.now() - cache.cuando < TTL_MS) return cache.emails;
  try {
    const filas = await sbSelect<{ email: string; activo: boolean | null }>(
      "staff", "select=email,activo"
    );
    const emails = new Set(
      filas.filter((f) => f.activo !== false).map((f) => f.email.trim().toLowerCase())
    );
    cache = { cuando: Date.now(), emails };
    return emails;
  } catch {
    // Si la tabla aún no existe o Supabase falla, NO se abre la puerta: sin
    // lista, no hay equipo. Un fallo nunca puede dar permisos.
    cache = { cuando: Date.now(), emails: new Set() };
    return cache.emails;
  }
}

/** Olvida la lista guardada. Se llama al añadir o quitar a alguien. */
export function olvidarEquipo(): void {
  cache = null;
}

/** ¿Está en el equipo y activo? El CEO no cuenta como equipo: es otra cosa. */
export async function esEquipo(email: string | null): Promise<boolean> {
  if (!email || isAdmin(email)) return false;
  return (await emailsDelEquipo()).has(email.trim().toLowerCase());
}

/** El papel de alguien en la app. */
export async function rolDe(email: string | null): Promise<Rol> {
  if (isAdmin(email)) return "ceo";
  return (await esEquipo(email)) ? "equipo" : "clienta";
}

/**
 * ¿Puede trabajar con las clientas? CEO y equipo.
 *
 * Es el permiso que abre las fichas, las revisiones, la técnica y el
 * analizador. NO abre el dinero, los contratos ni los ajustes.
 */
export async function puedeGestionarClientas(email: string | null): Promise<boolean> {
  return isAdmin(email) || (await esEquipo(email));
}

/** Toda la plantilla, para la pantalla del CEO. */
export async function listaEquipo(): Promise<DelEquipo[]> {
  const filas = await sbSelect<DelEquipo>("staff", "select=email,nombre,puesto,activo&order=email.asc");
  return filas.map((f) => ({ ...f, activo: f.activo !== false }));
}

/** El SQL de `supabase/equipo.sql`, para enseñarlo si falta la tabla. */
export const SETUP_SQL = `create table if not exists public.staff (
  email text primary key,
  nombre text,
  puesto text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.staff enable row level security;`;
