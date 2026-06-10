-- Contrato firmable por la clienta (firma electrónica simple).
-- Ejecuta este SQL en Supabase: Dashboard → SQL Editor → New query → Run.

-- 1) Plantilla de contrato (fila única, la misma para todas las clientas).
create table if not exists public.contract_template (
  id          int primary key default 1,
  title       text,
  file_path   text not null,
  version     int  not null default 1,
  updated_at  timestamptz not null default now(),
  constraint contract_template_single_row check (id = 1)
);

-- 2) Firmas de cada clienta (una por versión de la plantilla).
create table if not exists public.contract_signatures (
  id              uuid primary key default gen_random_uuid(),
  member_email    text not null,
  version         int  not null,
  signer_name     text not null,
  signature_path  text,
  signed_pdf_path text,
  ip              text,
  user_agent      text,
  signed_at       timestamptz not null default now(),
  unique (member_email, version)
);

create index if not exists contract_signatures_member_idx
  on public.contract_signatures (member_email);

-- 3) Bucket privado de Storage para la plantilla, las firmas y los PDF firmados.
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

-- Nota: el acceso se hace siempre desde el servidor con la clave de servicio
-- (service key), que ignora RLS. No hacen falta políticas adicionales para que
-- la app funcione. Si activas RLS en estas tablas, recuerda que el backend usa
-- la service key y no se ve afectado por las políticas.
