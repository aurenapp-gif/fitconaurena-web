-- Revisiones en fechas fijas: día 1 y día 15 de cada mes.
--
-- Antes cada clienta llevaba su propio ciclo de quince días desde la última que
-- hizo, y acababan repartidas por todo el calendario. Ahora todas caen el mismo
-- día, y la coach recibe el parte de quién la ha hecho y quién no.
--
-- Solo hace falta una columna nueva: la fecha del último parte enviado a la
-- coach. Sin ella, el cron (que corre cada hora) le mandaría el mismo parte una
-- vez por hora durante todo el día.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

alter table public.profiles add column if not exists last_checkin_report date;
