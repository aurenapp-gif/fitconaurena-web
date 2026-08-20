/**
 * Llamadas estratégicas de cada clienta. Tipos y utilidades compartidas entre
 * la ficha de la coach y el perfil de la clienta.
 *
 * Sin dependencias de servidor a propósito: los componentes cliente lo importan.
 */

export type MemberCall = {
  id: string;
  member_email: string;
  url: string;
  title: string | null;
  call_date: string | null;
  note: string | null;
  created_by?: string | null;
  created_at: string;
};

export const MAX_TITLE = 120;
export const MAX_NOTE = 4000;

/** Título que se enseña cuando la coach no ha puesto ninguno. */
export const DEFAULT_TITLE = "Llamada estratégica";

/**
 * Acepta solo http(s). Un enlace con esquema raro (javascript:, data:…)
 * acabaría pintado como enlace en el área de las clientas, así que se descarta
 * aquí y no llega ni a guardarse.
 */
export function safeLink(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Fecha de la llamada tal y como se enseña. Cae al día del alta si la coach
 * no indicó fecha, para que nunca aparezca una llamada «sin fecha». */
export function callDay(c: Pick<MemberCall, "call_date" | "created_at">): string {
  // `call_date` es un día suelto: se fija a mediodía UTC para que no se
  // desplace al día anterior según la zona horaria de quien lo mire.
  const d = c.call_date ? new Date(c.call_date + "T12:00:00Z") : new Date(c.created_at);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

/** SQL de la migración, para el aviso de «falta ejecutar esto en Supabase».
 * Copia de supabase/llamadas.sql sin los comentarios largos. */
export const SETUP_SQL = `create table if not exists public.member_calls (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  url          text not null,
  title        text,
  call_date    date,
  note         text,
  created_by   text,
  created_at   timestamptz not null default now()
);

create index if not exists member_calls_member_idx
  on public.member_calls (member_email, call_date desc, created_at desc);

alter table public.member_calls enable row level security;`;
