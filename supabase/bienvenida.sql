-- Alta de una clienta: pantalla inicial obligatoria (nombre, foto y aceptación
-- de las condiciones) antes de poder usar el área privada.
--
-- Se guarda la evidencia de la aceptación (momento exacto y versión del texto
-- aceptado), que es lo que da valor probatorio a la declaración.
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.

alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists terms_accepted_at       timestamptz;
alter table public.profiles add column if not exists terms_version           text;
