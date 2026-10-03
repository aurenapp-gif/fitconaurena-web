-- El equipo: entrenadores y nutricionistas que trabajan con las clientas.
--
-- El CEO NO está aquí: vive en la variable ADMIN_EMAILS. Es a propósito —un
-- fallo de la base de datos no puede dejarle fuera de su empresa, ni meter a
-- nadie en su sitio—.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.staff (
  email      text primary key,
  nombre     text,
  -- «Entrenador», «Nutricionista»… Solo para enseñarlo; no cambia permisos.
  puesto     text,
  -- Dar de baja sin borrar: así queda el rastro de quién trabajó aquí.
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text
);

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.staff enable row level security;
