-- Apuntar el entrenamiento como un hábito más, junto al agua y al descanso.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.
--
-- Un booleano y no un número de sesiones: la pregunta que contesta es «¿hoy
-- has entrenado?». Lo que hizo dentro del entreno ya está en workout_sets,
-- serie a serie; aquí lo que importa es la constancia, que es lo que se mira
-- junto al agua, los pasos y el sueño.
alter table public.habit_logs add column if not exists trained boolean;
