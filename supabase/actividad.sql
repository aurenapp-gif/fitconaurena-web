-- Registro de uso de la plataforma por parte de las clientas.
--
-- Sirve para acreditar la prestación efectiva del servicio (accesos, apertura
-- de los planes, descargas), que es la evidencia que se pide en una disputa o
-- una reclamación de devolución.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.

create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  action       text not null,   -- acceso | plan_abierto | plan_descargado | contrato_abierto
  detail       text,            -- p. ej. "Plan de nutrición"
  created_at   timestamptz not null default now()
);

-- Consulta habitual: la actividad de una clienta, de lo más reciente a lo más antiguo.
create index if not exists activity_log_member_idx
  on public.activity_log (member_email, created_at desc);
