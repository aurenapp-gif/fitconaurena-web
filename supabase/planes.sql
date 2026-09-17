-- Leer los planes y guardar el entreno serie a serie.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- 1) El plan, leído ---------------------------------------------------------
-- `estructura` es el plan en datos (comidas con sus cantidades, ejercicios con
-- sus series) y `contenido` el mismo plan en texto, que es lo que lee FitAI.
-- Se rellenan solos la primera vez que hacen falta: no hay que volver a subir
-- los planes de nadie ni rellenar nada a mano.
alter table public.plans add column if not exists contenido text;
alter table public.plans add column if not exists contenido_at timestamptz;
alter table public.plans add column if not exists estructura jsonb;

-- Cuántas semanas dura ESE bloque de entrenamiento (8, 10 o 12). Los planes
-- que ya están subidos se quedan en null y siguen contando doce, como hasta
-- ahora: nadie ve cambiar una fecha por esta migración.
alter table public.plans add column if not exists semanas smallint;

-- 2) El entreno, serie a serie ----------------------------------------------
-- Una sesión por cada vez que entrena. Queda atada a la clienta Y al plan con
-- el que entrenó: cuando le subas el bloque siguiente, lo de antes no se
-- mezcla con lo nuevo.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  plan_id uuid references public.plans(id) on delete set null,
  -- El día del plan tal y como se llama ahí: «Día A», «Lunes».
  dia text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_member_idx
  on public.workout_sessions (member_email, started_at desc);

-- Una fila por serie. El correo va también aquí, además de en la sesión: es lo
-- que hace imposible que una consulta mal filtrada devuelva el peso de otra.
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  member_email text not null,
  -- El nombre del ejercicio como está en su plan, y su posición en el día.
  ejercicio text not null,
  orden smallint,
  serie smallint not null,
  peso numeric(6,2),
  reps smallint,
  created_at timestamptz not null default now(),
  -- Una serie por número dentro de cada ejercicio de cada sesión: si se
  -- reenvía dos veces, se actualiza en vez de duplicarse.
  unique (session_id, ejercicio, serie)
);

create index if not exists workout_sets_member_idx
  on public.workout_sets (member_email, created_at desc);
-- Para «¿cuánto levantó la última vez en este ejercicio?», que es la consulta
-- que se hace en cada pantalla de ejercicio.
create index if not exists workout_sets_ejercicio_idx
  on public.workout_sets (member_email, ejercicio, created_at desc);

-- Cerradas al público, como el resto: solo entra el servidor con su clave.
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
