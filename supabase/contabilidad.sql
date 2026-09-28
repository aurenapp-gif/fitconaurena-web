-- Contabilidad: lo que se factura y lo que se cobra de verdad.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.
--
-- SON DOS COSAS DISTINTAS Y POR ESO SON DOS TABLAS:
--
--   · Una VENTA es lo que una clienta se ha comprometido a pagar. Firma un
--     programa de 2.500 € y eso es facturación del día que firma, aunque en la
--     cuenta todavía no haya entrado un euro.
--   · Un COBRO es dinero que ya está en el banco. Si paga en seis plazos, son
--     seis cobros contra la misma venta.
--
-- Mezclarlas es el error clásico: creerse rico por lo vendido y no tener con
-- qué pagar las facturas del mes.

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- «Programa 12 meses», «Renovación»… Lo que se le vendió.
  concepto text,
  -- En CÉNTIMOS y entero, nunca en decimales: 2.500,50 € son 250050. Los
  -- decimales de coma flotante pierden céntimos al sumar, y en dinero eso no
  -- se perdona.
  importe_cent bigint not null,
  fecha date not null,
  -- «Pago único», «seQura», «Transferencia»…
  metodo text,
  nota text,
  created_at timestamptz not null default now()
);

create table if not exists public.cobros (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  -- De qué venta es este cobro. Si se borra la venta, el cobro se queda:
  -- el dinero entró, y eso no se puede borrar por arrastre.
  venta_id uuid references public.ventas (id) on delete set null,
  importe_cent bigint not null,
  fecha date not null,
  metodo text,
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists ventas_fecha_idx on public.ventas (fecha desc);
create index if not exists ventas_member_idx on public.ventas (member_email);
create index if not exists cobros_fecha_idx on public.cobros (fecha desc);
create index if not exists cobros_member_idx on public.cobros (member_email);

-- Cerradas al público, como el resto: solo entra el servidor con su clave.
-- Y además, en la app solo las abre la coach.
alter table public.ventas enable row level security;
alter table public.cobros enable row level security;
