-- Foro de preguntas y respuestas de la comunidad (por temáticas, con hilos).
-- Ejecuta en Supabase: SQL Editor → New query → Run.

-- Temáticas (gestionadas por la coach).
create table if not exists public.forum_topics (
  id          serial primary key,
  name        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Preguntas.
create table if not exists public.forum_questions (
  id            uuid primary key default gen_random_uuid(),
  topic_id      int references public.forum_topics(id) on delete set null,
  author_email  text not null,
  author_name   text not null,
  title         text not null,
  body          text,
  resolved      boolean not null default false,
  pinned        boolean not null default false,
  created_at    timestamptz not null default now(),
  last_activity timestamptz not null default now()
);
create index if not exists forum_questions_topic_idx on public.forum_questions(topic_id);
create index if not exists forum_questions_activity_idx on public.forum_questions(last_activity desc);

-- Respuestas (hilo de cada pregunta).
create table if not exists public.forum_replies (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.forum_questions(id) on delete cascade,
  author_email text not null,
  author_name  text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists forum_replies_question_idx on public.forum_replies(question_id);

-- RLS activado (el backend usa la service key, que lo ignora; bloquea acceso anónimo).
alter table public.forum_topics    enable row level security;
alter table public.forum_questions enable row level security;
alter table public.forum_replies   enable row level security;
