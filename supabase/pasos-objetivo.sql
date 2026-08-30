-- Objetivo de pasos diarios de cada clienta.
--
-- Va junto al del agua y se rellena en el mismo sitio: la ficha de la clienta,
-- en «Agua, pasos y suplementación». La clienta lo ve al registrar sus hábitos,
-- que es donde ya apunta los pasos que ha dado.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- Pasos al día, en número entero. Sin objetivo (null) la clienta sigue
-- registrando sus pasos igual, solo que sin meta contra la que compararse.
alter table public.profiles add column if not exists steps_target integer;
