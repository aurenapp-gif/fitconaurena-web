-- Resumen de uso por clienta, calculado en la base de datos.
--
-- POR QUÉ. El panel de clientas se traía TODAS las filas de check_ins,
-- habit_logs, plans y technique_reviews y contaba en memoria. Supabase corta
-- cualquier respuesta en 1.000 filas y no avisa: pasado ese punto la app recibe
-- una lista incompleta y pinta números más bajos de los reales, o directamente
-- un 0 a clientas cuyas filas quedaron fuera del corte.
--
-- Comprobado: con 1.110 filas en habit_logs la consulta devolvía 1.000, y los
-- días de una clienta con 1.101 salían como 991.
--
-- Eso no es un problema de mañana. `habit_logs` crece un registro por clienta y
-- día, y `activity_log` uno por cada entrada y cada documento abierto: con las
-- clientas de hoy se cruzan las 1.000 filas en semanas.
--
-- Con esta vista el panel pide UNA fila por clienta. Con 1.000 clientas serían
-- 1.000 filas: el problema desaparece de raíz en vez de aplazarse.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.

create or replace view public.member_usage as
select
  p.email                                              as member_email,
  coalesce(c.total, 0)                                 as checkins,
  c.ultimo                                             as ultimo_checkin,
  coalesce(pl.total, 0)                                as planes,
  coalesce(t.total, 0)                                 as videos,
  -- Días distintos con actividad real: check-in, hábitos, vídeo o cualquier
  -- entrada registrada. Es el dato que acredita uso del servicio.
  coalesce(d.dias, 0)                                  as dias_uso
from public.profiles p
left join (
  select member_email, count(*) as total, max(created_at) as ultimo
  from public.check_ins group by 1
) c on c.member_email = p.email
left join (
  select member_email, count(*) as total from public.plans group by 1
) pl on pl.member_email = p.email
left join (
  select member_email, count(*) as total from public.technique_reviews group by 1
) t on t.member_email = p.email
left join (
  select member_email, count(distinct dia) as dias from (
    select member_email, created_at::date as dia from public.check_ins
    union
    select member_email, day               from public.habit_logs
    union
    select member_email, created_at::date  from public.technique_reviews
    union
    select member_email, created_at::date  from public.activity_log
  ) u group by 1
) d on d.member_email = p.email;

-- Las vistas heredan el RLS de las tablas que leen, pero se marca explícito
-- para que no dependa de la versión de Postgres.
alter view public.member_usage set (security_invoker = on);
