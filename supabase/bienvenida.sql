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

-- Las clientas que YA estaban dentro quedan exentas: la pantalla solo aparece a
-- quienes se den de alta a partir de ahora.
--
-- La fecha de corte es FIJA a propósito (no `now()`): así volver a ejecutar
-- este archivo más adelante es inofensivo, porque nunca eximirá a una clienta
-- nueva que todavía tenga la bienvenida pendiente.
update public.profiles
   set onboarding_completed_at = now()
 where onboarding_completed_at is null
   and created_at < '2026-08-13';
