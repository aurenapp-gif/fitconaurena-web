-- ============================================================
--  EXENCIÓN DE CONTRATO PARA LAS CLIENTAS QUE YA ESTABAN DENTRO
--
--  Ejecuta en Supabase → SQL Editor → New query → Run.
--  Es idempotente: se puede ejecutar varias veces sin riesgo.
--
--  Las clientas que ya estaban dadas de alta NO tienen que firmar
--  nada: entran directas a su área privada como siempre. La firma
--  obligatoria de contrato + anexo de salud solo se aplica a las
--  altas nuevas.
-- ============================================================

alter table public.profiles
  add column if not exists contracts_exempt boolean not null default false;

-- Exime a las que YA estaban dentro.
--
-- La fecha de corte es FIJA a propósito (no `now()`): así volver a ejecutar
-- este archivo más adelante es inofensivo, porque nunca eximirá a una clienta
-- nueva que sí deba firmar. Mismo criterio que en `bienvenida.sql`.
update public.profiles
   set contracts_exempt = true
 where created_at < '2026-08-16';

-- Comprobación: debe devolver 13 exentas y 0 pendientes de exención entre las
-- clientas anteriores al corte.
--   select count(*) filter (where contracts_exempt) as exentas,
--          count(*) filter (where not contracts_exempt) as obligadas
--     from public.profiles;
