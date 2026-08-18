-- Comunicados de la coach: tablón de solo lectura para las clientas. Únicamente
-- la coach publica (se valida en la API); ellas solo leen.
--
-- La misma tabla guarda dos tipos de entrada (columna `kind`):
--   'comunicado' → aviso escrito
--   'llamada'    → diferido de la llamada grupal (enlace + fecha de la llamada)
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  body       text not null,
  created_by text,
  created_at timestamptz not null default now()
);

-- Tipo de entrada y datos del diferido de la llamada grupal.
alter table public.announcements add column if not exists kind      text not null default 'comunicado';
alter table public.announcements add column if not exists link      text;
alter table public.announcements add column if not exists call_date date;

-- El texto es obligatorio en un comunicado, pero en una llamada puede ir vacío
-- (basta con el enlace y la fecha).
alter table public.announcements alter column body drop not null;

-- Listado siempre por fecha descendente (el más reciente arriba).
create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

-- RLS activado. IMPRESCINDIBLE: sin esto la tabla queda expuesta en la API
-- pública de Supabase y cualquiera con la URL del proyecto puede leer, escribir
-- y borrar los comunicados. El backend usa la clave de servicio, que ignora el
-- RLS, así que la web sigue funcionando igual; sin políticas, nadie más entra.
alter table public.announcements enable row level security;
