-- ============================================================
--  CONTRATOS v2: MÚLTIPLES PLANTILLAS + ANEXO DE SALUD
--
--  Ejecuta este SQL en Supabase → SQL Editor → New query → Run.
--  Es idempotente: se puede ejecutar varias veces sin duplicar.
--
--  Habilita: subir varias plantillas de contrato (1197, 1497, 1897,
--  etc.), asignar UNA a cada clienta, y que el anexo de salud sea
--  común a todas. Al firmar se guardan también los campos que la
--  clienta ha rellenado (DNI, dirección, teléfono…) y los datos de
--  salud, junto con la firma manuscrita.
-- ============================================================

-- 1) NUEVA TABLA DE PLANTILLAS (varias) ----------------------
create table if not exists public.contract_templates (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'contrato',   -- 'contrato' | 'anexo_salud'
  file_path   text not null,
  version     int  not null default 1,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists contract_templates_active_idx
  on public.contract_templates (active, kind);

-- 2) ASIGNACIÓN DE CONTRATO A CADA CLIENTA -------------------
-- Una fila por cada plantilla asignada a una clienta. Pendiente hasta
-- que la firme. El anexo de salud lo asigna el propio backend a todas.
create table if not exists public.contract_assignments (
  id            uuid primary key default gen_random_uuid(),
  member_email  text not null,
  template_id   uuid not null references public.contract_templates(id) on delete cascade,
  status        text not null default 'pendiente',   -- 'pendiente' | 'firmado'
  assigned_by   text,
  assigned_at   timestamptz not null default now(),
  signed_at     timestamptz
);
create index if not exists contract_assignments_member_idx
  on public.contract_assignments (member_email, status);
create unique index if not exists contract_assignments_unique
  on public.contract_assignments (member_email, template_id);

-- 3) FIRMAS: aceptar template_id + campos rellenos -----------
-- Extendemos la tabla existente en vez de rehacerla, para no perder
-- las firmas ya emitidas. `version` se mantiene por compatibilidad;
-- en las nuevas firmas se usa junto a template_id.
alter table public.contract_signatures
  add column if not exists template_id   uuid references public.contract_templates(id) on delete set null,
  add column if not exists assignment_id uuid references public.contract_assignments(id) on delete set null,
  add column if not exists field_values  jsonb;

create index if not exists contract_signatures_template_idx
  on public.contract_signatures (template_id);

-- La versión ya no debe ser NOT NULL (para plantillas nuevas puede
-- venir como 1 fijo, pero también queremos poder emitir firmas sin
-- que la fila del contrato antiguo lo bloquee). Se conserva en las
-- firmas existentes tal cual.
alter table public.contract_signatures alter column version drop not null;

-- 4) MIGRAR LA PLANTILLA ANTIGUA (fila única id=1) -----------
-- Si existía una plantilla en `contract_template` (singular), la
-- copiamos como plantilla del nuevo sistema para no perderla y para
-- que las firmas antiguas puedan seguir asociándose a algo.
do $$
declare
  old_row record;
  new_id uuid;
begin
  if to_regclass('public.contract_template') is not null then
    select * into old_row from public.contract_template where id = 1;
    if found then
      -- ¿ya la migramos antes? (mismo file_path)
      select id into new_id from public.contract_templates where file_path = old_row.file_path limit 1;
      if new_id is null then
        insert into public.contract_templates (title, kind, file_path, version, active)
        values (coalesce(old_row.title, 'Contrato'), 'contrato', old_row.file_path, coalesce(old_row.version, 1), true)
        returning id into new_id;
      end if;
      -- vincular las firmas antiguas (sin template_id) a la nueva plantilla
      update public.contract_signatures
         set template_id = new_id
       where template_id is null;
    end if;
  end if;
end $$;

-- La tabla vieja `contract_template` (singular) se puede dejar por
-- compatibilidad; el código nuevo ya no la lee. Si prefieres eliminarla
-- más adelante, descomenta:
--   drop table if exists public.contract_template;
