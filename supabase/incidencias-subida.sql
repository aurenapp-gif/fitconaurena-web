-- Registro de fallos al subir un plan.
--
-- POR QUÉ. La subida le falla a la coach en su navegador y no hay forma de
-- reproducirlo desde fuera: el error viaja en su pantalla y se pierde. Sin
-- saber en qué paso se rompe, con qué archivo y con qué mensaje exacto, cada
-- intento de arreglarlo es adivinar.
--
-- Guarda solo lo necesario para diagnosticar: el paso, el mensaje del
-- navegador, el tamaño y tipo del archivo, y el navegador. NADA del contenido
-- del plan ni de la clienta a la que iba dirigido.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.upload_errors (
  id         uuid primary key default gen_random_uuid(),
  paso       text,
  mensaje    text,
  via        text,          -- 'servidor' | 'directa'
  bytes      bigint,
  mime       text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists upload_errors_created_idx on public.upload_errors (created_at desc);

-- Sin RLS, cualquiera con la clave pública podría leerlos o llenarlos de basura.
alter table public.upload_errors enable row level security;
