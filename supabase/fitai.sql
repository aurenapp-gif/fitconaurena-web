-- FitAI: lo que preguntan las clientas y lo que se les responde. Se guarda por
-- dos motivos: para que la coach vea qué dudas tienen de verdad (y las
-- resuelva en la llamada o en un comunicado), y para poder revisar una
-- respuesta si alguna se queda corta.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- Antes se llamaba assistant_messages. Si ya se creó con el nombre viejo, se
-- renombra con lo que tuviera dentro en lugar de empezar otra tabla vacía.
alter table if exists public.assistant_messages rename to fitai_messages;
alter index if exists public.assistant_messages_member_idx rename to fitai_messages_member_idx;
alter index if exists public.assistant_messages_fecha_idx rename to fitai_messages_fecha_idx;

create table if not exists public.fitai_messages (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  question text not null,
  answer text,
  -- Marca la que FitAI no supo resolver y derivó a la coach.
  derivada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists fitai_messages_member_idx
  on public.fitai_messages (member_email, created_at desc);
create index if not exists fitai_messages_fecha_idx
  on public.fitai_messages (created_at desc);

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.fitai_messages enable row level security;
