/**
 * Tareas del equipo: lo que hay que hacer cada día, y quién lo ha hecho.
 *
 * La tarea se escribe una vez y vale para todos los días; lo que cambia a
 * diario es si se hizo. Por eso van en dos tablas: `staff_tasks` con el texto
 * y `staff_task_done` con una fila por día y persona.
 *
 * Sin dependencias de servidor: los componentes de cliente también importan
 * de aquí.
 */

export type Tarea = {
  id: string;
  titulo: string;
  detalle: string | null;
  /** A quién le toca. Vacío = a todo el equipo. */
  asignado_a: string | null;
  /** Cuanto más bajo, antes se hace. */
  prioridad: number;
  activa: boolean;
  created_at: string;
};

export type Hecha = { task_id: string; email: string; dia: string };

/** Cuántas tareas como mucho. De sobra para una semana de trabajo. */
export const MAX_TAREAS = 60;
export const MAX_TITULO = 120;
export const MAX_DETALLE = 500;

/** Lo que ordena la lista: primero lo prioritario y, a igualdad, lo más antiguo. */
export function porPrioridad(tareas: Tarea[]): Tarea[] {
  return [...tareas].sort(
    (a, b) => a.prioridad - b.prioridad || a.created_at.localeCompare(b.created_at)
  );
}

/**
 * Las de una persona: las suyas y las que son de todo el equipo.
 *
 * Una tarea sin asignar es de todos, no de nadie: si no, escribir una y
 * olvidarse de asignarla la dejaría invisible, que es el peor resultado.
 */
export function tareasDe(tareas: Tarea[], email: string): Tarea[] {
  const yo = email.trim().toLowerCase();
  return porPrioridad(
    tareas.filter((t) => t.activa && (!t.asignado_a || t.asignado_a.trim().toLowerCase() === yo))
  );
}

/** Clave de «esta tarea, este día, esta persona». */
export const claveHecha = (taskId: string, email: string, dia: string) =>
  `${taskId}|${email.trim().toLowerCase()}|${dia}`;

/** Cuántas de las suyas lleva hechas ese día. */
export function cuentaDelDia(tareas: Tarea[], hechas: Hecha[], email: string, dia: string): { hechas: number; total: number } {
  const mias = tareasDe(tareas, email);
  const marcadas = new Set(hechas.map((h) => claveHecha(h.task_id, h.email, h.dia)));
  return {
    hechas: mias.filter((t) => marcadas.has(claveHecha(t.id, email, dia))).length,
    total: mias.length,
  };
}

/** El SQL que hay que ejecutar si las tablas no están. */
export const SETUP_SQL = `-- Tareas del equipo
create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  detalle text,
  asignado_a text,
  prioridad integer not null default 100,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists staff_tasks_orden_idx on public.staff_tasks (activa, prioridad, created_at);

create table if not exists public.staff_task_done (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks(id) on delete cascade,
  email text not null,
  dia date not null,
  created_at timestamptz not null default now()
);
create unique index if not exists staff_task_done_unico_idx on public.staff_task_done (task_id, email, dia);
create index if not exists staff_task_done_dia_idx on public.staff_task_done (dia, email);`;
