-- El dinero que SALE: comisiones de recomendación, publicidad, herramientas…
--
-- Nació por las comisiones de afiliado, pero vale para cualquier gasto: sin
-- esto, el «margen» del mes es solo la facturación, y eso no es lo que se gana.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo.

create table if not exists public.gastos (
  id           uuid primary key default gen_random_uuid(),
  concepto     text,
  -- En CÉNTIMOS y entero, igual que las ventas y los cobros.
  importe_cent bigint not null,
  fecha        date not null,
  categoria    text,
  -- A quién se le paga, cuando el gasto va asociado a una clienta (una comisión).
  member_email text,
  nota         text,
  created_at   timestamptz not null default now(),
  created_by   text
);

create index if not exists gastos_fecha_idx on public.gastos (fecha desc);

alter table public.gastos enable row level security;
