-- ANEXO II-A: la elección de la clienta sobre el inicio del servicio.
--
-- Hasta ahora esto no se guardaba en ningún sitio, y en el PDF salía sin
-- marcar. Sin esa elección constando, la clienta conserva catorce días para
-- pedir la devolución íntegra: es la diferencia entre tener contrato y no
-- tenerlo.
--
-- Se guarda EN LA BASE además de en el PDF para poder consultarlo sin abrir el
-- documento (listados, avisos, bloqueo del alta), no como sustituto: el PDF
-- firmado sigue siendo la prueba.
--
-- Ejecuta en Supabase: SQL Editor → New query → Run.
-- Se puede ejecutar de nuevo sin riesgo: no duplica ni borra nada.

-- 'inmediato' | 'diferido' | null (contratos anteriores al cambio)
alter table public.contract_signatures add column if not exists inicio_servicio text;
alter table public.contract_signatures add column if not exists reconoce_perdida boolean;
alter table public.contract_signatures add column if not exists condicion_cliente text;
alter table public.contract_signatures add column if not exists nif_empresa text;
-- Día en que arranca de verdad el servicio (con el diferido, la firma + 14).
alter table public.contract_signatures add column if not exists service_start date;

-- Solo se admiten los dos valores del Anexo II-A. Un valor inventado aquí
-- significaría un contrato que no acredita lo que dice acreditar.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contract_signatures_inicio_servicio_chk'
  ) then
    alter table public.contract_signatures
      add constraint contract_signatures_inicio_servicio_chk
      check (inicio_servicio is null or inicio_servicio in ('inmediato', 'diferido'));
  end if;
end $$;

-- ALTA DIFERIDA: si eligió esperar, no se le da acceso hasta esta fecha. El
-- guard lo comprueba en cada entrada y el cron la da de alta al llegar el día.
alter table public.profiles add column if not exists access_from date;

create index if not exists profiles_access_from_idx
  on public.profiles (access_from) where access_from is not null;
