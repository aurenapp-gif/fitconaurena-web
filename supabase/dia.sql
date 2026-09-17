-- Las comidas que va marcando en el día.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- El día en horario de Madrid, YYYY-MM-DD.
  day date not null,
  -- El nombre de la comida normalizado (ver lib/dia.ts). Se guarda por nombre
  -- y no por posición: si el plan nuevo viene en otro orden, lo que marcó hoy
  -- sigue siendo lo que marcó.
  comida text not null,
  created_at timestamptz not null default now(),
  -- Marcar dos veces la misma comida no crea dos filas.
  unique (member_email, day, comida)
);

create index if not exists meal_logs_member_idx
  on public.meal_logs (member_email, day desc);

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.meal_logs enable row level security;
