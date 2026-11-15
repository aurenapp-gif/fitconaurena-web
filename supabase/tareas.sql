-- Tareas del equipo: lo que hay que hacer cada día, y quién lo ha hecho.
--
-- DOS TABLAS Y NO UNA, a propósito. La tarea («llamar a las que no han subido
-- la revisión») se escribe UNA vez y vale para todos los días; lo que cambia a
-- diario es si se hizo. Metiendo las dos cosas en la misma tabla habría que
-- duplicar la tarea cada día, y editar el texto no arreglaría los días ya
-- pasados.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.staff_tasks (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  detalle     text,
  -- A quién le toca. Vacío = a todo el equipo.
  asignado_a  text,
  -- Cuanto más bajo, antes se hace. Es lo que ordena la lista.
  prioridad   integer not null default 100,
  -- Retirar una tarea sin borrarla: así no se pierde quién la hizo y cuándo.
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  text
);

create index if not exists staff_tasks_orden_idx
  on public.staff_tasks (activa, prioridad, created_at);

-- Una fila = esa persona hizo esa tarea ese día. Si no hay fila, no la hizo.
-- Desmarcar borra la fila, que es más simple que guardar un «no» y además
-- deja el histórico limpio de ruido.
create table if not exists public.staff_task_done (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.staff_tasks(id) on delete cascade,
  email      text not null,
  dia        date not null,
  created_at timestamptz not null default now()
);

-- Marcar dos veces el mismo día es la misma marca, no dos.
create unique index if not exists staff_task_done_unico_idx
  on public.staff_task_done (task_id, email, dia);

create index if not exists staff_task_done_dia_idx
  on public.staff_task_done (dia, email);
