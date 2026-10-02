-- El mapa de la estrategia: por qué fase va cada clienta.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

create table if not exists public.strategy_phases (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- Orden dentro del mapa, empezando en 1. Es lo que da el «3 de 6».
  posicion int not null,
  titulo text not null,
  -- Qué se hace en esta fase. Lo lee la clienta, así que va en su idioma.
  detalle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Dos fases no pueden ocupar el mismo sitio en el mapa de la misma clienta.
  unique (member_email, posicion)
);

create index if not exists strategy_phases_member_idx
  on public.strategy_phases (member_email, posicion);

-- En qué fase está AHORA. Se guarda la posición, no el id: si se borra una
-- fase y se renumeran, la clienta sigue en el punto del recorrido en el que
-- estaba, no en una fila que ya no existe.
--
-- `null` = la coach todavía no ha marcado ninguna. Mientras sea null, la
-- clienta no ve el mapa: media estrategia a medio escribir no ayuda a nadie.
alter table public.profiles add column if not exists strategy_phase int;

-- Cerrada al público, como el resto: solo entra el servidor con su clave.
alter table public.strategy_phases enable row level security;
