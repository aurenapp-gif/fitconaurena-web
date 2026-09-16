-- Ajustes de la app que cambia la coach desde su Panel, sin tocar Vercel.
-- De momento uno: el enlace de la sala de la videollamada grupal (call_url).
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.app_settings enable row level security;
