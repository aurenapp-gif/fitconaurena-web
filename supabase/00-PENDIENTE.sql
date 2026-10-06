-- ============================================================
--  TODO LO PENDIENTE, EN UNA SOLA EJECUCIÓN
--  Supabase → SQL Editor → New query → pegar → Run
--
--  Es seguro ejecutarlo varias veces: no duplica ni borra nada.
--  Activa: comunicados, llamadas grupales, comentarios en los
--  planes, medidas nuevas de check-in, pantalla de bienvenida,
--  registro de uso del servicio, las comidas del día, la
--  contabilidad, el mapa de fases y la pauta de cada plan.
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
alter table public.profiles add column if not exists full_name               text;
alter table public.profiles add column if not exists address                 text;
alter table public.profiles add column if not exists postal_code             text;

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

-- 6) CERRAR EL ACCESO PÚBLICO --------------------------------
-- Toda tabla nueva nace ABIERTA en la API pública de Supabase: sin RLS,
-- cualquiera con la URL del proyecto puede leer, escribir y borrar. El backend
-- entra con la clave de servicio, que ignora el RLS, así que activarlo no
-- cambia nada para la web; sin políticas, no entra nadie más.
--
-- Este bloque recorre TODAS las tablas de public y activa el RLS en las que les
-- falte, para que no vuelva a quedarse ninguna abierta por descuido.
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

-- 6) LAS COMIDAS QUE VA MARCANDO EN EL DÍA ------------------
create table if not exists public.meal_logs (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- El día en horario de Madrid, YYYY-MM-DD.
  day          date not null,
  -- El nombre de la comida normalizado. Se guarda por nombre y no por
  -- posición: si el plan nuevo viene en otro orden, lo que marcó sigue
  -- siendo lo que marcó.
  comida       text not null,
  created_at   timestamptz not null default now(),
  -- Marcar dos veces la misma comida no crea dos filas.
  unique (member_email, day, comida)
);

create index if not exists meal_logs_member_idx
  on public.meal_logs (member_email, day desc);

alter table public.meal_logs enable row level security;

-- 7) CONTABILIDAD: VENTAS Y COBROS --------------------------
--
-- El dinero va en CÉNTIMOS y entero, nunca en decimales: 2.500,50 € son
-- 250050. Los decimales de coma flotante pierden céntimos al sumar, y en
-- dinero eso no se perdona.
create table if not exists public.ventas (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  concepto     text,
  importe_cent bigint not null,
  fecha        date not null,
  metodo       text,
  nota         text,
  created_at   timestamptz not null default now()
);

create table if not exists public.cobros (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- Si se borra la venta, el cobro se queda: el dinero entró, y eso no se
  -- puede borrar por arrastre.
  venta_id     uuid references public.ventas (id) on delete set null,
  importe_cent bigint not null,
  fecha        date not null,
  metodo       text,
  nota         text,
  created_at   timestamptz not null default now()
);

create index if not exists ventas_fecha_idx  on public.ventas (fecha desc);
create index if not exists ventas_member_idx on public.ventas (member_email);
create index if not exists cobros_fecha_idx  on public.cobros (fecha desc);
create index if not exists cobros_member_idx on public.cobros (member_email);

alter table public.ventas enable row level security;
alter table public.cobros enable row level security;

-- De dónde salió cada venta cuando no la escribió la coach: el índice único
-- es lo que impide apuntar dos veces el mismo contrato firmado.
alter table public.ventas add column if not exists origen text;
create unique index if not exists ventas_origen_idx on public.ventas (origen);

-- 8) EL MAPA DE FASES DE LA ESTRATEGIA ----------------------
create table if not exists public.strategy_phases (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- Orden dentro del mapa, empezando en 1. Es lo que da el «3 de 6».
  posicion     int not null,
  titulo       text not null,
  -- Qué se hace en esta fase. Lo lee la clienta.
  detalle      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (member_email, posicion)
);

create index if not exists strategy_phases_member_idx
  on public.strategy_phases (member_email, posicion);

-- En qué fase está AHORA. Se guarda la POSICIÓN, no el id de la fila: si se
-- borra una fase y se renumeran, la clienta sigue en el punto del recorrido
-- donde estaba. null = la coach aún no la ha marcado, y entonces no ve nada.
alter table public.profiles add column if not exists strategy_phase int;

alter table public.strategy_phases enable row level security;

-- 9) LA PAUTA DE CADA PLAN DE ALIMENTACIÓN ------------------
--
-- Sin esto el analizador no puede decir nada preciso de la comida: ve que el
-- peso no se mueve, pero no si es porque la pauta se queda corta de proteína
-- o porque no se está comiendo lo que pone el plan.
alter table public.plans add column if not exists kcal      int;
alter table public.plans add column if not exists protein_g int;

-- 10) EL EQUIPO: ENTRENADORES Y NUTRICIONISTAS --------------
--
-- El CEO no está aquí: vive en ADMIN_EMAILS. Un fallo de la base de datos no
-- puede dejarle fuera de su empresa ni meter a nadie en su sitio.
create table if not exists public.staff (
  email      text primary key,
  nombre     text,
  puesto     text,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.staff enable row level security;

-- 11) GASTOS: EL DINERO QUE SALE ---------------------------
--
-- Comisiones de recomendación, publicidad, herramientas… Sin esto, el
-- «margen» del mes es solo la facturación, y eso no es lo que se gana.
create table if not exists public.gastos (
  id           uuid primary key default gen_random_uuid(),
  concepto     text,
  importe_cent bigint not null,
  fecha        date not null,
  categoria    text,
  member_email text,
  nota         text,
  created_at   timestamptz not null default now(),
  created_by   text
);

create index if not exists gastos_fecha_idx on public.gastos (fecha desc);

alter table public.gastos enable row level security;

-- =====================================================================
-- CATÁLOGO DE EJERCICIOS: la foto y el vídeo de cada uno
-- (el texto de las fichas va en el código; esto solo guarda los archivos)
-- =====================================================================
create table if not exists public.exercise_media (
  exercise_id text primary key,
  image_path text,
  video_url text,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.exercise_media enable row level security;

-- =====================================================================
-- EL ENTRENO COMO HÁBITO: «¿hoy has entrenado?», junto al agua y el sueño
-- =====================================================================
alter table public.habit_logs add column if not exists trained boolean;
