-- Votación en los comunicados: la coach pregunta y las clientas eligen.
--
-- Sirve para decisiones de grupo —«¿cambiamos la llamada grupal al jueves?»—
-- sin sacarlas de la plataforma ni abrir un grupo de WhatsApp para cada cosa.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- Opciones de la votación, como lista de textos: ["Sí", "No"], ["Jueves", "Viernes"]…
-- NULL = comunicado normal, sin votación. Es lo que distingue uno de otro.
alter table public.announcements add column if not exists poll_options jsonb;

-- Cuándo se cerró la votación. Con fecha, ya no se admiten votos nuevos pero el
-- resultado se sigue viendo: cerrar no es borrar.
alter table public.announcements add column if not exists poll_closed_at timestamptz;

create table if not exists public.announcement_votes (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_email    text not null,
  -- Posición de la opción elegida dentro de `poll_options` (0 = la primera).
  option_index    smallint not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Un voto por clienta y comunicado. Cambiar de opinión actualiza el que hay,
  -- no añade otro: sin esto, quien dudase votaría tres veces sin querer.
  unique (announcement_id, member_email)
);

-- Las consultas son siempre «los votos de este comunicado».
create index if not exists announcement_votes_ann_idx
  on public.announcement_votes (announcement_id);

-- Sin RLS, cualquiera con la clave pública podría leer quién ha votado qué y
-- votar en nombre de otra. La web entra con la clave de servicio, que ignora el
-- RLS, así que con RLS activado y cero políticas nadie más entra.
alter table public.announcement_votes enable row level security;
