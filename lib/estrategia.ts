/**
 * El mapa de la estrategia: las fases por las que pasa una clienta y en cuál
 * está ahora.
 *
 * Lo rellena la coach, clienta por clienta, porque la estrategia es suya: la
 * app no se inventa fases. Mientras no haya fases o no haya ninguna marcada
 * como la de ahora, la clienta no ve el mapa.
 */

export type Fase = {
  id?: string;
  posicion: number;
  titulo: string;
  detalle?: string | null;
};

/** Lo que escribe la coach antes de guardarse (todavía sin posición). */
export type FaseNueva = { titulo: string; detalle?: string | null };

export const MAX_FASES = 20;
export const MAX_TITULO = 80;
export const MAX_DETALLE = 400;

/** Limpia lo que llega del formulario: recorta, quita vacías y renumera. */
export function normalizarFases(bruto: unknown): Fase[] {
  if (!Array.isArray(bruto)) return [];
  const fases: Fase[] = [];
  for (const f of bruto) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const titulo = typeof o.titulo === "string" ? o.titulo.trim().slice(0, MAX_TITULO) : "";
    // Una fase sin título no es una fase: no se guarda ni cuenta para el «de 6».
    if (!titulo) continue;
    const detalleBruto = typeof o.detalle === "string" ? o.detalle.trim().slice(0, MAX_DETALLE) : "";
    fases.push({ posicion: fases.length + 1, titulo, detalle: detalleBruto || null });
    if (fases.length >= MAX_FASES) break;
  }
  return fases;
}

/**
 * La fase en curso, ajustada al mapa que hay.
 *
 * Si la coach borra fases y la clienta estaba en la 6 de un mapa que ahora
 * tiene 4, se queda en la última que existe en vez de en una que ya no está.
 */
export function faseEnCurso(fases: Fase[], actual: unknown): number | null {
  if (fases.length === 0) return null;
  const n = Number(actual);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(Math.trunc(n), fases.length);
}

export type Progreso = {
  actual: number;
  total: number;
  titulo: string;
  detalle: string | null;
  /** Lo que viene después, para que vea que el recorrido sigue. */
  siguiente: string | null;
  /** Porcentaje recorrido, contando la fase en curso como empezada. */
  pct: number;
};

/**
 * Lo que ve la clienta. `null` cuando no hay nada que enseñar todavía: sin
 * fases, o con fases pero sin que la coach haya marcado por cuál va.
 */
export function progresoDeFases(fases: Fase[], actual: unknown): Progreso | null {
  const orden = [...fases].sort((a, b) => a.posicion - b.posicion);
  const n = faseEnCurso(orden, actual);
  if (n === null) return null;
  const esta = orden[n - 1];
  return {
    actual: n,
    total: orden.length,
    titulo: esta.titulo,
    detalle: esta.detalle ?? null,
    siguiente: n < orden.length ? orden[n].titulo : null,
    // Con una sola fase, estar en ella es estar al principio, no al 100 %.
    pct: orden.length === 1 ? 50 : Math.round(((n - 1) / (orden.length - 1)) * 100),
  };
}

/** «Fase 3 de 6». Una línea, que es como se lee de un vistazo. */
export function textoFase(p: Progreso): string {
  return `Fase ${p.actual} de ${p.total}`;
}

/** El SQL de `supabase/estrategia.sql`, para enseñarlo si falta la tabla. */
export const SETUP_SQL = `create table if not exists public.strategy_phases (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  posicion int not null,
  titulo text not null,
  detalle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_email, posicion)
);

create index if not exists strategy_phases_member_idx
  on public.strategy_phases (member_email, posicion);

alter table public.profiles add column if not exists strategy_phase int;

alter table public.strategy_phases enable row level security;`;
