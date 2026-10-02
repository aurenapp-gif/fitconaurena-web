-- Las calorías y la proteína que pauta cada plan de alimentación.
--
-- Sin esto, el analizador no puede decir nada preciso de la comida: puede ver
-- que el peso no se mueve, pero no si es porque la pauta se queda corta de
-- proteína o porque no se está comiendo lo que pone el plan.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.

alter table public.plans add column if not exists kcal int;
alter table public.plans add column if not exists protein_g int;
