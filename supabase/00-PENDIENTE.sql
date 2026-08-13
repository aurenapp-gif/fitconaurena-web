-- ============================================================
--  TODO LO PENDIENTE, EN UNA SOLA EJECUCIÓN
--  Supabase → SQL Editor → New query → pegar → Run
--
--  Es seguro ejecutarlo varias veces: no duplica ni borra nada.
--  Activa: comunicados, llamadas grupales, comentarios en los
--  planes, medidas nuevas de check-in, pantalla de bienvenida y
--  registro de uso del servicio.
-- ============================================================

-- 1) COMUNICADOS Y LLAMADAS GRUPALES ------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  body       text not null,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.announcements add column if not exists kind      text not null default 'comunicado';
alter table public.announcements add column if not exists link      text;
alter table public.announcements add column if not exists call_date date;
alter table public.announcements alter column body drop not null;

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

-- 2) COMENTARIO DE LA COACH EN CADA PLAN ---------------------
alter table public.plans add column if not exists note text;

-- 3) MEDIDAS NUEVAS EN LOS CHECK-INS -------------------------
alter table public.check_ins add column if not exists glute numeric;  -- glúteo
alter table public.check_ins add column if not exists back  numeric;  -- espalda

-- 4) PANTALLA DE BIENVENIDA (solo clientas nuevas) -----------
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists terms_accepted_at       timestamptz;
alter table public.profiles add column if not exists terms_version           text;

-- Exime a las clientas que YA estaban dentro. La fecha es fija a propósito:
-- así volver a ejecutar este archivo nunca eximirá a una clienta nueva.
update public.profiles
   set onboarding_completed_at = now()
 where onboarding_completed_at is null
   and created_at < '2026-08-13';

-- 5) REGISTRO DE USO DEL SERVICIO ----------------------------
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  action       text not null,   -- acceso | plan_abierto | plan_descargado | contrato_abierto
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists activity_log_member_idx
  on public.activity_log (member_email, created_at desc);
