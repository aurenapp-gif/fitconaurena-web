-- Buzón de dudas anónimas: las clientas dejan aquí lo que no se atreven a
-- preguntar en la llamada grupal, y la coach lo responde (por escrito o con un
-- enlace a un vídeo).
--
-- EL ANONIMATO ES DE VERDAD, y por eso esta tabla es tan corta:
--   · No se guarda el correo de quien escribe. Ni IP, ni navegador.
--   · La fecha es un DÍA, no un instante. Con la hora exacta bastaría para
--     cruzarla con activity_log (que sí registra cuándo entra cada clienta) y
--     deducir quién ha escrito qué. Guardando solo el día, ese cruce no vale.
--   · El id es aleatorio (uuid v4), así que tampoco delata el orden real.
-- La única excepción es `reply_email`: si la clienta pide respuesta privada,
-- marca la casilla a sabiendas y entonces sí se guarda su correo, pero esa duda
-- deja de ser pública (no la ve nadie más).
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.dudas (
  id          uuid primary key default gen_random_uuid(),
  -- Tema, para poder agrupar y filtrar (entrenamiento, nutricion…).
  categoria   text not null default 'otras',
  body        text not null,
  -- Respuesta de la coach: texto y/o enlace a un vídeo donde lo explica.
  answer      text,
  answer_url  text,
  answered_at timestamptz,
  -- nueva | para_llamada | para_video | resuelta
  status      text not null default 'nueva',
  -- Oculta la duda a las clientas sin llegar a borrarla (moderación).
  hidden      boolean not null default false,
  -- Solo si la clienta pidió respuesta privada. Si va relleno, la duda NO se
  -- publica: es una consulta directa a la coach.
  reply_email text,
  -- A propósito `date` y no `timestamptz`: ver la nota de arriba.
  created_at  date not null default current_date
);

create index if not exists dudas_created_at_idx on public.dudas (created_at desc);
create index if not exists dudas_status_idx     on public.dudas (status);

-- "Me gusta" de cada duda: sirve para saber a cuánta gente le interesa y así
-- priorizar qué responder o sobre qué grabar un vídeo.
--
-- No guardamos quién vota, sino un HASH irreversible de su correo (HMAC con
-- MEMBERS_SECRET, calculado en el servidor). Con eso se puede impedir que la
-- misma persona vote dos veces sin llegar a saber quién es: del hash no se
-- vuelve al correo. Si alguien mirase la base de datos, vería votos anónimos.
create table if not exists public.duda_likes (
  duda_id    uuid not null references public.dudas(id) on delete cascade,
  voter_hash text not null,
  created_at date not null default current_date,
  primary key (duda_id, voter_hash)
);

create index if not exists duda_likes_duda_idx on public.duda_likes (duda_id);

-- RLS activado (el backend usa la clave de servicio, que la ignora; esto cierra
-- el acceso anónimo directo a la API pública de Supabase).
alter table public.dudas      enable row level security;
alter table public.duda_likes enable row level security;
