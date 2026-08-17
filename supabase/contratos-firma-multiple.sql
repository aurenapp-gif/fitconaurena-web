-- ============================================================
--  ARREGLO: una clienta no podía firmar un SEGUNDO documento
--
--  Ejecuta en Supabase → SQL Editor → New query → Run.
--  Es idempotente: se puede ejecutar varias veces sin riesgo.
--
--  `contract_signatures` conservaba una restricción del diseño
--  original, cuando había UNA sola plantilla: unique(member_email,
--  version). Con varias plantillas todas valen version = 1, así que
--  al firmar el segundo documento (típicamente el anexo de salud)
--  chocaba con el primero y el registro fallaba con un 409.
--
--  La condición correcta ahora es una firma por clienta y PLANTILLA.
-- ============================================================

-- 1) Fuera la restricción antigua (el nombre es el que genera Postgres
--    a partir de `unique (member_email, version)` en la tabla original).
alter table public.contract_signatures
  drop constraint if exists contract_signatures_member_email_version_key;

-- 2) Por si en algún entorno se creó con otro nombre, la buscamos y la
--    eliminamos igualmente: cualquier restricción única que sea
--    exactamente (member_email, version).
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'contract_signatures'
       and con.contype = 'u'
       and (
         select array_agg(att.attname::text order by att.attname::text)
           from unnest(con.conkey) k
           join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k
       ) = array['member_email','version']::text[]
  loop
    execute format('alter table public.contract_signatures drop constraint %I', c.conname);
  end loop;
end $$;

-- 3) La condición correcta: una firma por clienta y plantilla.
--    Se crea solo si no hay duplicados que lo impidan (no debería haberlos).
create unique index if not exists contract_signatures_member_template_key
  on public.contract_signatures (member_email, template_id)
  where template_id is not null;

-- Comprobación:
--   select member_email, template_id, count(*)
--     from public.contract_signatures
--    group by 1,2 having count(*) > 1;
