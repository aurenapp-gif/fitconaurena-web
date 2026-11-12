-- ============================================================
--  QUÉ FALTA POR EJECUTAR
--  Supabase → SQL Editor → New query → pegar → Run
--
--  SOLO LEE. No crea, no cambia y no borra nada.
--  Devuelve una lista de lo que el programa espera y no encuentra.
--  Si no devuelve ninguna fila, no falta nada.
-- ============================================================

with esperadas_tablas(tabla) as (values
  ('activity_log'),
  ('announcement_votes'),
  ('announcements'),
  ('app_settings'),
  ('cobros'),
  ('contract_assignments'),
  ('contract_signatures'),
  ('contract_template'),
  ('contract_templates'),
  ('exercise_media'),
  ('fitai_messages'),
  ('forum_questions'),
  ('forum_replies'),
  ('forum_topics'),
  ('gastos'),
  ('meal_logs'),
  ('member_calls'),
  ('member_supplements'),
  ('staff'),
  ('strategy_phases'),
  ('upload_errors'),
  ('ventas'),
  ('workout_sessions'),
  ('workout_sets')
),
esperadas_columnas(tabla, columna) as (values
  ('announcements','call_date'),
  ('announcements','kind'),
  ('announcements','link'),
  ('announcements','poll_closed_at'),
  ('announcements','poll_options'),
  ('check_ins','agua_media'),
  ('check_ins','arm'),
  ('check_ins','back'),
  ('check_ins','chest'),
  ('check_ins','comidas_fuera'),
  ('check_ins','cumplimiento'),
  ('check_ins','dias_entreno'),
  ('check_ins','exercises'),
  ('check_ins','glute'),
  ('check_ins','hips'),
  ('check_ins','pasos_media'),
  ('check_ins','rating'),
  ('check_ins','thigh'),
  ('check_ins','waist'),
  ('contract_signatures','condicion_cliente'),
  ('contract_signatures','inicio_servicio'),
  ('contract_signatures','nif_empresa'),
  ('contract_signatures','reconoce_perdida'),
  ('contract_signatures','service_start'),
  ('contract_signatures','template_id'),
  ('habit_logs','cycle_day'),
  ('habit_logs','energy'),
  ('habit_logs','trained'),
  ('plans','contenido'),
  ('plans','contenido_at'),
  ('plans','estructura'),
  ('plans','exercises'),
  ('plans','kcal'),
  ('plans','note'),
  ('plans','protein_g'),
  ('plans','semanas'),
  ('profiles','access_from'),
  ('profiles','address'),
  ('profiles','contracts_exempt'),
  ('profiles','full_name'),
  ('profiles','hide_weight'),
  ('profiles','last_checkin_report'),
  ('profiles','onboarding_completed_at'),
  ('profiles','postal_code'),
  ('profiles','service_ends_at'),
  ('profiles','steps_target'),
  ('profiles','strategy_phase'),
  ('profiles','terms_accepted_at'),
  ('profiles','terms_version'),
  ('profiles','water_target_l'),
  ('ventas','origen')
)
select 'FALTA LA TABLA' as que, t.tabla as donde, '' as detalle
from esperadas_tablas t
where not exists (
  select 1 from information_schema.tables i
  where i.table_schema = 'public' and i.table_name = t.tabla
)
union all
select 'falta la columna', c.tabla, c.columna
from esperadas_columnas c
where exists (
  select 1 from information_schema.tables i
  where i.table_schema = 'public' and i.table_name = c.tabla
)
and not exists (
  select 1 from information_schema.columns i
  where i.table_schema = 'public' and i.table_name = c.tabla and i.column_name = c.columna
)
order by 1, 2, 3;
