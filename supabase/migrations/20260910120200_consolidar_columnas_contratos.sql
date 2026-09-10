-- =====================================================================
-- Consolidar las 5 parejas de columnas duplicadas en 'contratos'
--
-- La tabla arrastraba dos juegos de columnas para el mismo dato, fruto de
-- haber cambiado el esquema a mano sin migraciones. Unas pantallas
-- escribían en un juego y otras leían del otro, así que la estructura de
-- pagos del contrato aparecía vacía.
--
--   SE CONSERVA                      SE ELIMINA
--   monto_cuota_inicial          <-  valor_cuota_inicial
--   numero_cuotas_iniciales      <-  num_cuotas_iniciales
--   monto_cuota_ordinaria        <-  valor_cuota_ordinaria
--   numero_cuotas_ordinarias     <-  num_cuotas_ordinarias
--   tiene_cuotas_extraordinarias <-  tiene_extraordinarias
--
-- Se conserva el juego 'monto_/numero_' porque es el que acompaña a las
-- columnas de extraordinarias que ya usa el generador
-- (monto_cuota_extraordinaria, numero_cuotas_extraordinarias,
-- frecuencia_extraordinaria, dia_pago_mensual).
--
-- Ninguna parte del código fuente usa las columnas eliminadas: solo
-- aparecían declaradas en src/lib/supabase/types.ts.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. Respaldo completo de la tabla antes de tocar nada
-- ---------------------------------------------------------------
create table if not exists public.contratos_respaldo_20260910 as
  select * from public.contratos;

comment on table public.contratos_respaldo_20260910 is
  'Copia de contratos previa a la consolidación de columnas duplicadas '
  '(migración 20260910120200). Eliminar cuando la Fase 1 esté validada.';

-- ---------------------------------------------------------------
-- 2. Trasladar los datos que solo existan en la columna vieja
-- ---------------------------------------------------------------
update public.contratos set
  monto_cuota_inicial          = coalesce(monto_cuota_inicial,          valor_cuota_inicial),
  numero_cuotas_iniciales      = coalesce(numero_cuotas_iniciales,      num_cuotas_iniciales),
  monto_cuota_ordinaria        = coalesce(monto_cuota_ordinaria,        valor_cuota_ordinaria),
  numero_cuotas_ordinarias     = coalesce(numero_cuotas_ordinarias,     num_cuotas_ordinarias),
  tiene_cuotas_extraordinarias = coalesce(tiene_cuotas_extraordinarias, tiene_extraordinarias);

-- ---------------------------------------------------------------
-- 3. Comprobación: nada se queda atrás
--    Si algún contrato tuviera dato en la columna vieja y no en la nueva,
--    la migración se detiene aquí sin borrar nada.
-- ---------------------------------------------------------------
do $$
declare
  pendientes integer;
begin
  select count(*) into pendientes
  from public.contratos
  where (valor_cuota_inicial   is not null and monto_cuota_inicial          is null)
     or (num_cuotas_iniciales  is not null and numero_cuotas_iniciales      is null)
     or (valor_cuota_ordinaria is not null and monto_cuota_ordinaria        is null)
     or (num_cuotas_ordinarias is not null and numero_cuotas_ordinarias     is null)
     or (tiene_extraordinarias is not null and tiene_cuotas_extraordinarias is null);

  if pendientes > 0 then
    raise exception
      'Quedan % contratos con datos sin trasladar. No se eliminan columnas.',
      pendientes;
  end if;
end $$;

-- ---------------------------------------------------------------
-- 4. Eliminar las columnas duplicadas
-- ---------------------------------------------------------------
alter table public.contratos
  drop column if exists valor_cuota_inicial,
  drop column if exists num_cuotas_iniciales,
  drop column if exists valor_cuota_ordinaria,
  drop column if exists num_cuotas_ordinarias,
  drop column if exists tiene_extraordinarias;

-- ---------------------------------------------------------------
-- 5. Dejar documentado qué significa cada columna que queda
-- ---------------------------------------------------------------
comment on column public.contratos.monto_cuota_inicial is
  'Monto total de la cuota inicial, antes de diferirla.';
comment on column public.contratos.numero_cuotas_iniciales is
  'En cuántos pagos mensuales se difiere la cuota inicial.';
comment on column public.contratos.monto_cuota_ordinaria is
  'Valor de cada mensualidad ordinaria.';
comment on column public.contratos.numero_cuotas_ordinarias is
  'Cantidad de mensualidades ordinarias.';
comment on column public.contratos.tiene_cuotas_extraordinarias is
  'Si el plan incluye refuerzos o cuotas extraordinarias.';
comment on column public.contratos.valor_total is
  'PENDIENTE FASE 1: hoy guarda el total financiado (capital + intereses). '
  'Debe pasar a guardar el precio de venta pactado; los intereses se derivan '
  'del plan de pagos.';
