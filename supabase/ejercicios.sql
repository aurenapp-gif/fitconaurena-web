-- La foto y el vídeo de cada ejercicio del catálogo.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.
--
-- El texto de cada ficha (cómo se hace, ajuste de la máquina, sustitutos) vive
-- en el código y no aquí: así cada cambio pasa por una revisión. Lo que sí
-- vive aquí son los archivos, porque se suben desde el gimnasio el día que se
-- graban y no pueden esperar a un despliegue.
create table if not exists public.exercise_media (
  -- El identificador de la ficha: «hip-thrust-maquina».
  exercise_id text primary key,
  -- Dónde está la foto dentro del bucket «ejercicios».
  image_path text,
  -- El identificador del vídeo de YouTube. Solo el identificador: es lo único
  -- que se puede incrustar según la política de seguridad de la web.
  video_url text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.exercise_media enable row level security;
