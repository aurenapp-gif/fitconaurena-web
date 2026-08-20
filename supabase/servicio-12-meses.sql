-- Vencimiento del servicio contratado (12 meses desde el alta).
--
-- OJO, NO es lo mismo que `renewal_date`: esa es la renovación MENSUAL del plan
-- (se recalcula sola cada vez que se sube un plan nuevo y alimenta la agenda y
-- el porcentaje de servicio consumido). Esta columna es el fin del servicio
-- contratado, que hoy son doce meses.
--
-- Se rellena sola al dar de alta a una clienta. La coach puede corregirla a
-- mano desde la ficha si un caso concreto tiene otra duración.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

alter table public.profiles add column if not exists service_ends_at date;

-- A propósito NO se rellena a las clientas que ya estaban: el encargo es
-- «cualquier persona que entre a partir de ahora». Para ponérselo a las
-- antiguas, la coach lo hace desde la ficha de cada una.
