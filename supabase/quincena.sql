-- Lo que la clienta contesta de su quincena en la revisión.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.
--
-- No sustituye a lo que apunta cada día: lo completa. Hay clientas que no
-- apuntan a diario —en octubre, la mitad no llegaba a diez días al mes— pero
-- sí saben decir «unos 8.000 pasos de media» cuando se les pregunta. Un dato
-- aproximado que existe vale más que uno exacto que no está.
--
-- Todo en enteros para poder comparar quincenas sin interpretar texto. El
-- agua va en DÉCIMAS DE LITRO (15 = 1,5 L) y así no hay decimales.
alter table public.check_ins add column if not exists pasos_media   smallint;
alter table public.check_ins add column if not exists agua_media    smallint;
alter table public.check_ins add column if not exists dias_entreno  smallint;
alter table public.check_ins add column if not exists cumplimiento  smallint;
alter table public.check_ins add column if not exists comidas_fuera smallint;
