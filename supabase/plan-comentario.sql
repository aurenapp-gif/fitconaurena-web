-- Comentario de la coach en cada plan subido, visible para la clienta junto a
-- su planificación (indicaciones, cambios respecto al mes anterior, etc.).
-- Ejecuta en Supabase: SQL Editor → New query → Run.

alter table public.plans add column if not exists note text;
