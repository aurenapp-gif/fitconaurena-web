-- Asistente del programa: lo que preguntan las clientas y lo que se les
-- responde. Se guarda por dos motivos: para que la coach vea qué dudas tienen
-- de verdad (y las resuelva en la llamada o en un comunicado), y para poder
-- revisar una respuesta si alguna se queda corta.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  question text not null,
  answer text,
  -- Marca la que el asistente no supo resolver y derivó a la coach.
  derivada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_member_idx
  on public.assistant_messages (member_email, created_at desc);
create index if not exists assistant_messages_fecha_idx
  on public.assistant_messages (created_at desc);

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.assistant_messages enable row level security;
