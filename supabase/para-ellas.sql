-- Rediseño «Para ellas»: progresión de entrenamiento, ciclo, energía y
-- ocultar el peso.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- Ejercicios del plan de entrenamiento, tal y como los escribe la coach al
-- subirlo (uno por línea). Lista de textos: ["Sentadilla", "Press banca"].
-- Son los que la clienta rellena en cada revisión.
alter table public.plans add column if not exists exercises jsonb;

-- Peso y repeticiones por ejercicio en cada revisión. Lista de objetos:
-- [{"name": "Sentadilla", "weight": 40, "reps": 8}]. La comparación con la
-- revisión anterior se calcula al mostrarla, no se guarda.
alter table public.check_ins add column if not exists exercises jsonb;

-- Hábitos: día del ciclo (opcional, 1–45) y energía del día (1–5).
alter table public.habit_logs add column if not exists cycle_day smallint;
alter table public.habit_logs add column if not exists energy smallint;

-- La clienta puede pedir que su peso no se le enseñe (sigue guardándose y la
-- coach lo sigue viendo).
alter table public.profiles add column if not exists hide_weight boolean not null default false;
