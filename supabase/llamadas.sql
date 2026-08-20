-- Llamadas estratégicas: la grabación de la llamada individual de cada clienta.
-- La coach pega el enlace desde la ficha de la clienta y esta lo ve en su
-- perfil, en la pestaña «Llamadas».
--
-- Es cada clienta con LA SUYA: nada de esto es común, por eso va colgado del
-- correo y no de un comunicado general (las llamadas grupales siguen estando en
-- `announcements`, que sí las ve todo el mundo).
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.member_calls (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- Enlace a la grabación (Zoom, Drive, YouTube en oculto…). Obligatorio: sin
  -- enlace no hay nada que enseñar.
  url          text not null,
  -- Título opcional. Si va vacío, en pantalla se muestra «Llamada estratégica».
  title        text,
  -- Día en que se hizo la llamada, para ordenarlas como las recuerda la clienta.
  call_date    date,
  -- Nota de la coach: temas tratados, deberes, minuto clave…
  note         text,
  created_by   text,
  created_at   timestamptz not null default now()
);

-- Las consultas siempre son «las llamadas de esta clienta, de la más reciente
-- a la más antigua».
create index if not exists member_calls_member_idx
  on public.member_calls (member_email, call_date desc, created_at desc);

-- Sin RLS, cualquiera con la clave pública podría leer las llamadas de todas.
-- La web entra siempre con la clave de servicio, así que no hace falta ninguna
-- política: con RLS activado y cero políticas, la clave pública no ve nada.
alter table public.member_calls enable row level security;
