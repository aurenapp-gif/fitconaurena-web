-- CIERRE DEL ACCESO PÚBLICO A LA BASE DE DATOS (RLS)
--
-- Por qué existe este archivo
-- ---------------------------
-- En Supabase, toda tabla de `public` nace ABIERTA en la API REST pública: con
-- la URL del proyecto y la clave anónima —que es pública por diseño— cualquiera
-- puede leer, escribir y borrar. Lo que lo impide es el Row Level Security.
--
-- El 17/08/2026 Supabase avisó de que `activity_log` y `announcements` estaban
-- así. Se comprobó y era cierto: se leían los correos de las clientas y sus
-- entradas a la plataforma, y se podía insertar y borrar. Se cerraron ese mismo
-- día. Las migraciones que las crearon (actividad.sql y comunicados.sql) no
-- activaban el RLS; ya lo hacen.
--
-- La web NO se ve afectada: el backend entra con la clave de servicio, que
-- ignora el RLS por completo. Al no haber políticas, nadie más entra. Ese es el
-- estado correcto para esta arquitectura, donde nada se consulta directamente
-- desde el navegador.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar tantas veces como quieras: solo toca lo que esté abierto.

-- 1) Activa el RLS en toda tabla de `public` que no lo tenga.
do $$
declare t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    raise notice 'RLS activado en %', t.relname;
  end loop;
end $$;

-- 2) Comprobación: debe devolver 0 filas. Si sale alguna, esa tabla está
--    abierta al mundo.
select c.relname as tabla_abierta_al_publico
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

-- 3) Comprobación de los archivos: todos los buckets deben ser privados.
--    Si alguno sale como público, sus archivos (fotos, planes, contratos
--    firmados) se descargan sin permiso con solo saber la ruta.
select id as bucket_publico from storage.buckets where public = true;
