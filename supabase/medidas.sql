-- Medidas corporales en los check-ins (además del peso). Todas opcionales (cm).
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: "if not exists" ignora las que ya están.

alter table public.check_ins add column if not exists waist numeric;  -- cintura
alter table public.check_ins add column if not exists hips  numeric;  -- cadera
alter table public.check_ins add column if not exists chest numeric;  -- pecho
alter table public.check_ins add column if not exists arm   numeric;  -- brazo
alter table public.check_ins add column if not exists thigh numeric;  -- cuádriceps

-- Añadidas después:
alter table public.check_ins add column if not exists glute numeric;  -- glúteo
alter table public.check_ins add column if not exists back  numeric;  -- espalda
