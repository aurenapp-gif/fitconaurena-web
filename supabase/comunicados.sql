-- Comunicados de la coach: tablón de solo lectura para las clientas. Únicamente
-- la coach publica (se valida en la API); ellas solo leen.
-- Ejecuta en Supabase: SQL Editor → New query → Run.

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  body       text not null,
  created_by text,
  created_at timestamptz not null default now()
);

-- Listado siempre por fecha descendente (el más reciente arriba).
create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);
