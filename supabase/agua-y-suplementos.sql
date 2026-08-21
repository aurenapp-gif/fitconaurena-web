-- Pauta de agua y suplementación de cada clienta.
--
-- La coach lo rellena desde la ficha de la clienta y esta lo ve en su perfil:
-- cuánta agua tiene que beber al día y qué suplementos toma, con la dosis, el
-- momento del día y el enlace para comprarlos.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- Agua: en LITROS al día, que es como se prescribe. La clienta lo registra en
-- vasos en su seguimiento de hábitos, así que en pantalla se le enseña también
-- la equivalencia aproximada.
alter table public.profiles add column if not exists water_target_l numeric;

create table if not exists public.member_supplements (
  id           uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- Qué es: «Creatina», «Omega 3», «Magnesio»…
  name         text not null,
  -- Cuánto: «1 cápsula», «5 g», «2 comprimidos».
  dose         text,
  -- Cuándo: «con el desayuno», «antes de entrenar», «antes de dormir».
  timing       text,
  -- Dónde comprarlo. Opcional: hay suplementos que ya tiene en casa.
  url          text,
  -- Cualquier apunte suelto (marca concreta, con comida, ciclar…).
  note         text,
  created_by   text,
  created_at   timestamptz not null default now()
);

-- Las consultas siempre son «los suplementos de esta clienta», en el orden en
-- que se los fue añadiendo.
create index if not exists member_supplements_member_idx
  on public.member_supplements (member_email, created_at);

-- Sin RLS, cualquiera con la clave pública podría leer la pauta de todas. La
-- web entra siempre con la clave de servicio, así que no hace falta ninguna
-- política: con RLS activado y cero políticas, la clave pública no ve nada.
alter table public.member_supplements enable row level security;
