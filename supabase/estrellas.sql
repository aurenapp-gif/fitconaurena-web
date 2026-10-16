-- Cómo de contenta está la clienta este mes: de 1 a 5 estrellas.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.
--
-- Va en la revisión y no en una encuesta aparte porque es el único momento
-- del mes en el que ella ya está parándose a mirar cómo le va. Y porque un
-- 2 sobre 5 en la revisión del día 1 es el aviso más temprano que existe de
-- que esa clienta no renueva: llega semanas antes que dejar de apuntar.
alter table public.check_ins add column if not exists rating smallint;
